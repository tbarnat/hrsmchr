const Database = require('../dist/server/Database').Database;


const config = {
  uri: 'mongodb://localhost:27017',
  dbName: 'hmDev'
}

let horsosQWE = [
  {name: 'Czejen'},
  {name: 'Parys'},
  {name: 'Bella'},
  {name: 'Jadzia'},
  {name: 'Dzidzia'},
  {name: 'Bracio'},
  {name: 'Lady'}]

let kidosQWE =
  [{
    name: 'Emilka',
    prefs: {
      best: ['Dzidzia'],
      nice: ['Lady', 'Jadzia'],
      isok: ['Parys', 'Bracio'],
      limp: ['Czejen', 'Bella'],
      excl: []
    }
  },
    {
      name: 'Weronika',
      prefs: {
        best: ['Bella'],
        nice: ['Bracio', 'Jadzia'],
        isok: ['Lady', 'Czejen'],
        limp: ['Parys'],
        excl: ['Dzidzia']
      }
    },
    {
      name: 'Maja',
      prefs: {
        best: ['Lady', 'Czejen'],
        nice: ['Jadzia', 'Bella'],
        isok: ['Parys'],
        limp: ['Dzidzia'],
        excl: ['Bracio']
      }
    },
    {
      name: 'Julka Duza',
      prefs: {
        best: ['Bella'],
        nice: ['Lady', 'Jadzia'],
        isok: ['Parys', 'Czejen'],
        limp: ['Dzidzia'],
        excl: ['Bracio']
      }
    },
    {
      name: 'Julka Mala',
      prefs: {
        best: ['Czejen'],
        nice: ['Lady', 'Jadzia'],
        isok: ['Parys', 'Bella'],
        limp: ['Dzidzia'],
        excl: ['Bracio']
      }
    },
    {
      name: 'Paula',
      prefs: {
        best: ['Dzidzia', 'Czejen'],
        nice: ['Lady'],
        isok: ['Bracio'],
        limp: ['Jadzia', 'Parys'],
        excl: ['Bella']
      }
    },
    {
      name: 'Julka Lonza',
      prefs: {
        best: ['Jadzia'],
        nice: ['Bracio'],
        isok: ['Czejen'],
        limp: ['Lady'],
        excl: ['Parys', 'Bella', 'Dzidzia']
      }
    },
    {
      name: 'Ola C',
      prefs: {
        best: ['Parys', 'Bella'],
        nice: ['Lady', 'Jadzia'],
        isok: ['Dzidzia'],
        limp: ['Czejen'],
        excl: ['Bracio']
      }
    },
    {
      name: 'Kalina',
      prefs: {
        best: ['Dzidzia', 'Bella'],
        nice: ['Bracio', 'Jadzia'],
        isok: ['Lady'],
        limp: ['Czejen', 'Parys'],
        excl: []
      }
    },
    {
      name: 'IncompletePreferences',
      prefs: {
        best: ['Bella'],
        nice: ['Bracio'],
        isok: ['Lady', 'Czejen'],
        limp: ['Parys'],
        excl: ['Dzidzia']
      }
    },
    {
      name: 'InvalidPreferences',
      prefs: {
        best: ['Bella'],
        nice: ['Bracio', 'Bug-bug-bug'],
        isok: ['Lady', 'Czejen'],
        limp: ['Parys'],
        excl: ['Dzidzia']
      }
    },
  ]

let trainersQWE = [{name: 'Ja'}, {name: 'Paulina'}, {name: 'Inna'}]

let horsosTEST_USER1 = [
  {name: 'Aaa1', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'aab2', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'Aaa2', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'Abb4', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'aaa3', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'aaa4', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'Abb5', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'aaa5', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'aab1', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'aab3', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'Abb6', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'Xxx1', hrcHash: '43TUNdHvko6piEA7koogAo'},
  {name: 'Xxx2', hrcHash: '43TUNdHvko6piEA7koogAo'},]


fillInDatabase = async () => {

  const db = new Database(config);
  await db.init(false)

  // cleaning old db
  let allCollections = ['users', 'horsos', 'kidos', 'trainers', 'diary']
  for (let collName of allCollections) {
    let data = await db.find(collName)
    if (data.length) {
      await db.drop(collName)
    }
  }

  //--------QWE----------
  let collections = {horsos: horsosQWE, kidos: kidosQWE, trainers: trainersQWE}
  for (let collName of Object.keys(collections)) {
    await db.insertMany(collName, collections[collName])
    await db.updateMany(collName, {}, {$set: {"hrcHash": "ttU2NdHvko6piEA7k00gAO"}})
  }
  await db.insertOne('users', {
    userName: 'qwe',
    email: 'qwe@wp.pl',
    password: '7815696ecbf1c96e6894b779456d330e', //asd
    hrcs: ['ttU2NdHvko6piEA7k00gAO'],
    lastVisit: Date.now(),
    allVisits: 0
  })
  await db.insertOne('diary', {
    day: '2019-01-01',
    hours: [
      {
        hour: '1230',
        trainer: ['Ja'],
        remarks: '',
        trainingsDetails: [
          {kidName: 'Ola C', horse: 'Bella'},
        ]
      },
    ],
    dailyExcludes: [],
    hrcHash: "ttU2NdHvko6piEA7k00gAO"
  })

  //--------TEST_USER1----------
  await db.insertOne('users', {
    userName: 'test_user1',
    email: 'tu1@gmail.com',
    password: '7815696ecbf1c96e6894b779456d330e', //asd
    hrcs: ['43TUNdHvko6piEA7koogAo'],
    lastVisit: Date.now(),
    allVisits: 0
  })
  await db.insertMany('horsos', horsosTEST_USER1)


  //--------TEST_USER2----------
  await db.insertOne('users', {
    userName: 'test_user2',
    email: 'tu2@gmail.com',
    password: '7815696ecbf1c96e6894b779456d330e', //asd
    hrcs: ['rHC9iMCNFKA7a9DCT3gYpr'],
    lastVisit: Date.now(),
    allVisits: 0
  })

}

initDatabase = async () => {
  try {
    await fillInDatabase()
    return true
  } catch (err) {
    console.log(err, '### filling error')
  }
  return false
}

//initDatabase()

exports.initTestServer = async() => {
  let stepUno = await initDatabase()
  if(!stepUno){
    return false
  }
  require('./devDBserver').startServer
  return true
}