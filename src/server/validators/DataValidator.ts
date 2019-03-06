import {Database} from "../Database";
import {Collection, default as Preferences} from "../DataModel";
import Utils from "../utils/Utils";

interface IInterfaceObj{
  req: boolean //is required field
  altReq?: string, // at least one of fields sharing the same group name is required
  key: string
  type: string
  regEx?: string
  minL?: number
  maxL?: number
}

export default class DataValidator{

  constructor(private userName: string, private db: Database) {
  }

  async validateNewEntry(data:any, collName: Collection): Promise<string>{
    let name = data.name
    if(collName === 'undefined'){
      return `Internal error: unknown collection`
    }
    let items: any[] = await this.db.find(collName, {userName:this.userName, name})
    if (items && items[0]) {
      return `Entry named: ${name} already exists in db`
    }

    let errorMsg = this.patternCheck(data, collName)
    if(errorMsg){
      return errorMsg
    }

    if(collName === 'kidos'){
      return (await this.checkPrefsForKidos(data.prefs))
    }
    return ''
  }

  async validateEditEntry(data:any, collName: Collection): Promise<string>{

    if(data.newName){
      if(typeof data.newName !== 'string'){
        `Internal error: type of: ${data.newName} is incorrect`
      }
      if(data.newName.length > 20){
        return `Internal error: max length of: ${data.newName}`
      }
    }

    if(collName === 'undefined'){
      return `Internal error: unknown collection`
    }

    let errorMsg = this.patternCheck(data, collName)
    if(errorMsg){
      return errorMsg
    }

    if(collName === 'kidos'){
      return (await this.checkPrefsForKidos(data.prefs))
    }
    return ''
  }

  private async checkPrefsForKidos(prefs: any): Promise<string>{
    let allHorsosForUserNo: number = (await this.db.find('horsos', {userName:this.userName})).length
    if(!allHorsosForUserNo){
      return `Before adding kid, please add all horses in your Riding Center`
    }
    if(Object.keys(prefs).length !== Preferences.allPrefCat.length){
      return `Internal error: incorrect number of preferences`
    }
    let allHorsosInPrefsNo: number = 0
    Object.keys(prefs).forEach(prefCat => {
      allHorsosInPrefsNo += prefs[prefCat].length
    })
    if(allHorsosInPrefsNo !== allHorsosForUserNo){
      return `Internal error: number of horsos in prefs incorrect`
    }
    //could be checked more thoroughly
    return ''
  }

  private patternCheck(data:any, collName: Collection): string{
    let objPatternArr = this.getPatternObjForCollection(collName)
    let missingKeys: string[] = []
    let actualKeys = Object.keys(data)
    objPatternArr.filter(fieldPattern => {return fieldPattern.req}).forEach(inter => {
      if(!actualKeys.includes(inter.key)){
        missingKeys.push(inter.key)
      }
    })
    if(missingKeys.length){
      return `Internal error: object properties are missing: ${missingKeys.join(',')}`
    }
    let allGroups = objPatternArr.filter(fieldPattern => {return fieldPattern.altReq})
      .map(fieldPattern => {return fieldPattern.altReq})
    if(allGroups.length){
      allGroups = [...new Set(allGroups)]
      allGroups.forEach(groupOfFields => {
        // check if only one field of list is filled
        let namesOfFieldsInGroup = objPatternArr.filter(fieldPattern => {
          return fieldPattern.altReq == groupOfFields
        }).map(fieldPattern => {return fieldPattern.key})

        let groupFieldCount = Utils.intersection(actualKeys,namesOfFieldsInGroup).length
        if(groupFieldCount < 1){
          return `Internal error: one of field: ${namesOfFieldsInGroup.join(',')} has to be submitted`
        }
        if(groupFieldCount > 1){
          return `Internal error: just one of field: ${namesOfFieldsInGroup.join(',')} has to be submitted`
        }
      })
    }

    if(missingKeys.length){
      return `Internal error: at least one of:  has to be specified`
    }
    for(let actualKey of actualKeys){
      let fieldPattern = objPatternArr.find(inter => {return inter.key === actualKey})
      if(fieldPattern){
        if(typeof data[actualKey] != fieldPattern.type){
          return `Internal error: type of: ${actualKey} is incorrect`
        }
        if(fieldPattern.maxL && data[actualKey].length > fieldPattern.maxL){
          return `Internal error: max length of: ${actualKey}`
        }
        if(fieldPattern.minL && data[actualKey].length < fieldPattern.minL){
          return `Internal error: min length of: ${actualKey}`
        }
        if(fieldPattern.regEx){
          return `Internal error: regEx check`
        }
      }else{
        return `Internal error: surplus property: ${actualKey} added to object`
      }
    }
    return ''
  }

  private getPatternObjForCollection(collName: Collection): IInterfaceObj[]{
    switch (collName){
      case 'horsos':
        return [
          {req: true, key: 'name',type: 'string', minL:2, maxL:20},
          {req: false, key: 'newName',type: 'string', minL:2, maxL:20},
          {req: false, key: 'maxDailyWorkload',type: 'number'},
          {req: false, key: 'descr',type: 'string', maxL:200},
          {req: false, key: 'remarks',type: 'string', maxL:200},
          {req: false, altReq: 'howToAddToPrefs', key: 'addAsHorse',type: 'string', minL:2, maxL:20},
          {req: false, altReq: 'howToAddToPrefs', key: 'addToPrefLevel',type: 'string', minL:2, maxL:20},
          /*this is special cheat key added when there is no kido for user*/
          {req: false, altReq: 'howToAddToPrefs', key: 'noKidosCheatKey',type: 'boolean'}
        ]
      case 'kidos':
        return [
          {req: true, key: 'name',type: 'string', minL:2, maxL:20},
          {req: false, key: 'newName',type: 'string', minL:2, maxL:20},
          {req: true, key: 'prefs',type: 'object'},
          {req: false, key: 'remarks',type: 'string', maxL:200},
        ]
      case 'trainers':
        return [
          {req: true, key: 'name',type: 'string', minL:2, maxL:20},
          {req: false, key: 'newName',type: 'string', minL:2, maxL:20},
          {req: false, key: 'descr',type: 'string', maxL:200},
          {req: false, key: 'remarks',type: 'string', maxL:200},
          {req: false, key: 'isDefault',type: 'boolean'},
        ]
      /*case 'users':
        return [
          {req: true, key: 'userName',type: 'string', maxL:20},
          {req: false, key: 'password',type: 'string', regEx:'(?=.{5,})',maxL:20}, //at least 5 char
          {req: true, key: 'email',type: 'string', regEx:'\'/^(([^<>()[\\]\\\\.,;:\\s@\\"]+(\\.[^<>()[\\]\\\\.,;:\\s@\\"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/\'',maxL:40},
        ]*/
      default: return[]
    }
  }
}