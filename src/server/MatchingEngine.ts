import {
  default as DataModel,
  IHorseRidingDayQ,
  IHorseRidingHour,
  IHorseRidingHourQ,
  IHorso,
  IKido,
  PrefType
} from "./DataModel";
import {Database} from "./Database";

interface IRankedHourlySolution {
  solution: IHorseRidingHour,
  rank: number
}

interface IResultList {
  results: IHorseRidingHour[]
  errorMsg?: string
}

export default class MatchingEngine {

  public allHorsos: string[] = []
  private avaHorsos: string[] = []
  private kidosInQueryD: string[] = [] //ACHTUNG! - those are distinguishable kidos, not all kidos in query
  private allKidosInQuery: string[] = []
  private kidosPrefs: { [kidoName: string]: PrefType } = {}
  /* penaltyPoints: number of occurrence of horse on each kido's pref level (global), and higher levels(global)
    + (index level (each kido) * (number of available horses in sables)^2) */
  private penaltyPoints: { [kidoName: string]: { [horsoName: string]: number } } = {}
  private searchOrder: { [kidoName: string]: string[] } = {} //ordered list of all horses by it's rank by kido
  /* intermediate solution - sorted list of solutions for every hour, so first level are hours 1-8, and second level are solutions*/
  private qInProc: IRankedHourlySolution[][]
  private finalList: IResultList


  constructor(protected db: Database) {
  }

  //exposed main method, asked from outside of class
  public async getMatches(dailyQuery: IHorseRidingDayQ): Promise<IResultList> {
    let errorMsg = await this.initSomeClassVariables(dailyQuery)
    if (errorMsg) {
      return {results: [], errorMsg: `${errorMsg}`}
    }

    /*  Finding solutions for every hour separately  */
    dailyQuery.hours.forEach(hour => this.hourlyMatchingLimited(hour))


    //update Ranks (junie pamietam o co chodzilo) - trzeba to sprawdzic chyba
    //qInProc.forEach(hourList => hourList.forEach(hour => this.updateRanks(hour)))



    return this.combineHoursLimited(dailyQuery)
    // -> formatting to IHorseRidingDay on client side

  }

  private async initSomeClassVariables(dailyQuery: IHorseRidingDayQ): Promise<string> {

    /*  Drop calculation-wise cache  */
    this.clearScopeVariables()

    /*  Checking of global conditions - if there is enough horses  */
    await this.initAllHorsosInStables()

    let minHorsosReq: number = 0
    dailyQuery.hours.forEach(hour => hour.trainingsDetails.forEach(training => {
      minHorsosReq++
    }))

    if (this.allHorsos.length < minHorsosReq) {
      return `All horses in stable: ${this.allHorsos.length} is less then required: ${minHorsosReq}`
    }
    this.initAvailableHorses(dailyQuery)
    if (this.avaHorsos.length < minHorsosReq) {
      return `Horses available: ${this.avaHorsos.length} is less then required: ${minHorsosReq}`
    }

    /*  Update preferences and create index type  */
    let kidosWithIncompletePrefs = await
    this.updateKidosPreferences(dailyQuery)
    if (!kidosWithIncompletePrefs.length) {
      return `Preferences for: ${kidosWithIncompletePrefs.join(', ')} is/are incomplete/incorrect`
    }

    /*  Count penalty points for kido-horso combination, and set searching order*/
    this.countPenaltyPointsAndOrder(dailyQuery)

    return ''
  }

  private clearScopeVariables() {
    this.allHorsos = []
    this.avaHorsos = []
    this.kidosInQueryD = []
    this.kidosPrefs = {}
    this.penaltyPoints = {}
    this.searchOrder = {}
  }

  private async initAllHorsosInStables() {
    this.allHorsos = ((await this.db.find('horso')) as IHorso[]).map(horso => horso.name)
  }

  private initAvailableHorses(dailyQuery: IHorseRidingDayQ) {
    this.avaHorsos = this.allHorsos.filter(horsoName => {
      return (dailyQuery.dailyExcludes.indexOf(horsoName) >= 0)
    })
  }

  private async updateKidosPreferences(dailyQuery: IHorseRidingDayQ): Promise<string[]> {
    this.initDistKidosInQuery(dailyQuery)

    let allKidos = ((await this.db.find('kido')) as IKido[])
    allKidos.filter(kido => {
      return (this.kidosInQueryD.indexOf(kido.name) >= 0)
    }).forEach(kido => {
      //filter the daily excludes
      Object.keys(kido.prefs).map(category => {
        return kido.prefs[category].filter(horso => {
          return dailyQuery.dailyExcludes.indexOf(horso) <= 0
        })
      })
      this.kidosPrefs[kido.name] = kido.prefs
    })
    // check if each kidosPref table comprise exactly the number available horses
    let kidosWithIncompletePrefs: string[] = []
    Object.keys(this.kidosPrefs).forEach(kido => {
      let kidosHorsesInPrefs: number = 0
      DataModel.allPrefCat.forEach(prefCat => {
        kidosHorsesInPrefs += this.kidosPrefs[kido][prefCat].length
      })
      if (kidosHorsesInPrefs != this.avaHorsos.length) {
        kidosWithIncompletePrefs.push(kido)
      }
    })
    return kidosWithIncompletePrefs
  }

  private initDistKidosInQuery(dailyQuery: IHorseRidingDayQ) {
    dailyQuery.hours.forEach(hour => {
      hour.trainingsDetails.forEach(training => {
        if (this.kidosInQueryD.indexOf(training.kidName) < 0) {
          this.kidosInQueryD.push(training.kidName)
        }
      })
    })
  }

  private initAllKidosInQuery(dailyQuery: IHorseRidingDayQ) {
    dailyQuery.hours.forEach(hour => {
      hour.trainingsDetails.forEach(training => {
        this.allKidosInQuery.push(training.kidName)
      })
    })
  }

  private countPenaltyPointsAndOrder(dailyQuery: IHorseRidingDayQ) {
    this.initAllKidosInQuery(dailyQuery)
    // Counts amount of occurrence for each horse in this and higher levels and store it in temporary object 'penaltForFreq'
    let penaltyForFreq: { [prefCat: string]: { [horsoName: string]: number } }
    let penaltyFromUpperLevels: { [horsoName: string]: number }

    DataModel.incPrefCat.forEach(prefCat => {
      this.allKidosInQuery.forEach(kidoName => {
        this.kidosPrefs[kidoName][prefCat].forEach(horso => {
          penaltyFromUpperLevels[horso] = penaltyFromUpperLevels[horso] ? penaltyFromUpperLevels[horso] : 0
          penaltyForFreq[prefCat][horso] = penaltyForFreq[prefCat][horso] ? penaltyForFreq[prefCat][horso] : 0
          penaltyForFreq[prefCat][horso] += 1 + penaltyFromUpperLevels[horso]
        })
      })
      Object.keys(penaltyForFreq[prefCat]).forEach(horso => {
        penaltyFromUpperLevels[horso] = penaltyFromUpperLevels[horso] ? penaltyFromUpperLevels[horso] : 0
        let storedValue: number = penaltyForFreq[prefCat][horso]
        penaltyForFreq[prefCat][horso] += penaltyFromUpperLevels[horso]
        penaltyFromUpperLevels[horso] += storedValue
      })
    })
    // Get the full penalty points rank for each horse of each kido
    this.kidosInQueryD.forEach(kido => {
      DataModel.incPrefCat.forEach(prefCat => {
        this.kidosPrefs[kido][prefCat].forEach(horso => {
          this.penaltyPoints[kido][horso] = penaltyForFreq[prefCat][horso] + DataModel.getPrefCatValue(prefCat) * this.avaHorsos.length ** 2
        })
      })
    })
    //Get the searchOrder based on lowest penaltyPoinst score
    Object.keys(this.penaltyPoints).forEach(kido => {
      DataModel.incPrefCat.forEach(prefCat => {
        let sortedHorsos = this.kidosPrefs[kido][prefCat].sort((h1, h2) => {
          return this.penaltyPoints[kido][h2] - this.penaltyPoints[kido][h1]
        })
        if (!this.searchOrder[kido]) {
          this.searchOrder[kido] = []
        }
        this.searchOrder[kido].concat(sortedHorsos)
      })
    })
  }

  private hourlyMatchingLimited(hour: IHorseRidingHourQ){
    let limitForTime = 50 * hour.trainingsDetails.length // + max 0,5 sec per hour scheduled for that day
    let limitForPossiblities = 20 * limitForTime
    let hourTimer = setTimeout(() => {
      this.hourlyMatchingWorker(hour)
      if(this.qInProc[0].length > limitForPossiblities){
        clearTimeout(hourTimer)
      }
    }, limitForTime)
  }

  //recursively find solutions by searchOrder and excluding horses from prefs
  private hourlyMatchingWorker(hour: IHorseRidingHourQ){

  }

  /*private updateRanks(oldRankedSolution: IRankedHourlySolution): IRankedHourlySolution {
    let updatedRankedSolution = {}
    return updatedRankedSolution
  }*/

  private combineHoursLimited(dailyQuery: IHorseRidingDayQ){
    let totalTrainings = 0
    dailyQuery.hours.forEach(hour => {
      totalTrainings += hour.trainingsDetails.length
    })
    let limitForTime = 100 * totalTrainings * this.avaHorsos.length // + max ~5s to juxtapose results
    let limitForPossiblities = 20 * limitForTime
    let juxTimer = setTimeout(() => {
      this.combineHoursWorker()
      if(this.finalList.results.length >= limitForPossiblities){
        clearTimeout(juxTimer)
      }
    },limitForTime)
    if(this.finalList.results.length){
      return this.finalList
    }else{
      return {results: [], errorMsg: `Could not find any good results :(`}
    }
  }

  //todo search for permutation by expanding an input set by rank
  private combineHoursWorker(){

  }
}

/*Horse Matcher algorithm engine:

#Assumptions:
There are five levels of preferences for each kido. The last one is special level - excludes.
THe levels are: Best / Nice / Ok / Rather not / Excludes
For new kidos all the horses are added to the third group by default.

#Data preparation:
The condition for matching possibility should be evaluated Trainings <= all hourses in sable * max hourse trainings per day
At first all the preferences are modified to remove all the dailyExcludes: from users pref. and from the operator input (some horses which are for examples injured that day)
Calculation is divided in hourly parts - each hour is one calculation which are combined later on.
Then all the horses included in the modified preferences are ranked (in hour scope). This rank represent a usability measure of each horse for each kido and for operator.
The measure is calculated as follows: number of occurrence of horse on each kido's pref level, and higher levels  + (index level * (number of available horses in sables)^2)

#Hourly matching
The goal of hourly matching is to create a sorted list of best possible solutions of matching problem
The idea is to iterate over horses starting from those with lowest rank, and recursively add solutions to the list
The solutions is stored with solution score
The calculation should be stopped after (50ms x number of trainings) or (100 x number of trainings) Traing = osobojazda
The solution scores should be updated for sake of calculations usability important for next calculation stage:

let scoreUpdateablePart = score % availableHourses ** 2
scoreUpdateablePart = scoreUpdateablePart / (numberOfTrainingInThisHour ** 2)
let newScore = score - score % availableHourses ** 2 + scoreUpdateablePart

this is kinf of correction allowing comparison of hours with any and few kidos
Sort the hourly sollutions by updated score

#JunxtaposeHours
At this point you have a hourly arrays of solutions which you have to permute
Create permutation in a increasing manner (look for lower 'newScore' value for any hour and find all new permutation with this element)
If the new permutation does not fulfill the max three hours condition for any hourse - discard it.
The calculation should be stopped after (100ms x number of hours x available horses) or (1000 x number of hours x total hourses in stables)
The result is already sorted it can be returned to the frontend, scores can be discarded
*/