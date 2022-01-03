const fs = require('fs');
const request = require('request');

const collectionName = "chikn";
let startingIndex = 1;
let endingIndex = 10000;

/**
 * Order of tasks
 * change collectionName
 * getMetaData
 * calculateTotalNumberOfTraits
 * updateTraitTotals
 * calculateRarity
 * 
 */



const baseUrl = "https://cdn1.chikn.farm/tokens/";

async function doRequest(base, tokenId){
    let requestUrl = base + tokenId;
    console.log("Requested url: " + requestUrl)
    return new Promise(function (resolve, reject) {
        let options = {json: true};
        request(requestUrl, options, (error, response, body) => {
            if(error){
                console.log(error)
            }
            if(!error && response.statusCode == 200){
                resolve(body);
            }  
        })
    })
}

async function getMetaData(){
    let collectionData = {}

    for (let i = startingIndex; i < endingIndex; i++) {
        let filePath = `./collections/${collectionName}/metadata/${i}.json`;
        let res = await doRequest(baseUrl, i)


        fs.writeFileSync(filePath, JSON.stringify(res, null, 4));

        collectionData[i] = res;
    }

    fs.writeFileSync(`./collections/${collectionName}/metadata/full-collection.json`, JSON.stringify(collectionData, null, 4));
    
}

function getTraitTotals(collectionName, category){
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
    let parsedData = JSON.parse(rawData);
    return parsedData[category]["total"];
  }

async function calculateTotalNumberOfTraits(){
    let traits = {}

    
    for (let i = startingIndex; i < endingIndex; i++) {
        let filePath = `./collections/${collectionName}/metadata/${i}.json`;

        let raw = fs.readFileSync(filePath);
        let parsed = JSON.parse(raw);

        let attributes = parsed["attributes"];

        //console.log(attributes)

        for(var j = 0; j < attributes.length; j++){
            let traitMap = attributes[j];
            //console.log(traitMap)

            var keys = Object.keys(traitMap);
            let category = traitMap[keys[0]];

            // adding new categories to JSON
            if(traits[category] == null || traits[category] == undefined){
                traits[category] = {};
            }

            if(traits[category][traitMap[keys[1]]] == null || traits[category][traitMap[keys[1]]] == undefined){
                traits[category][traitMap[keys[1]]] = 1;
            } else {
                traits[category][traitMap[keys[1]]] += 1;
            }
            
        }
    }

    console.log(traits)

    fs.writeFileSync(`./collections/${collectionName}/metadata/trait-counts.json`, JSON.stringify(traits, null, 4));

}

async function calculateRarity(){
    let rarityList = []

    let filePath = `./collections/${collectionName}/metadata/full-collection.json`;
    let raw = fs.readFileSync(filePath);
    let parsed = JSON.parse(raw);

    for (let i = startingIndex; i < endingIndex; i++) {
        let tokenMap = parsed[i];
        let attributes = tokenMap["attributes"];

        var tokenRarity = 0;

        for(let j = 0; j < attributes.length; j++){
            let type = attributes[j]["trait_type"];
            let value = attributes[j]["value"];

            let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
            let parsedData = JSON.parse(rawData);

            let count = parsedData[type][value];
            let chance = count/getTraitTotals(collectionName, type);

            tokenRarity += 1/chance;
            
        }

        let rarityMap = {
            "id":i,
            "rarity":tokenRarity
        }

        rarityList.push(rarityMap)
    }

    rarityList.sort(function(a,b){
        let prop = "rarity"
        if (a[prop] < b[prop]) {    
            return 1;    
        } else if (a[prop] > b[prop]) {    
            return -1;    
        }    
        return 0;
    })

    var rarityJson = {};
    var rankings = []

    for(var i = 0; i < rarityList.length; i++){
        var json = rarityList[i];
        rarityJson[json["id"]] = json["rarity"];
        rankings.push(json["id"]);
    }

    //console.log(rarityJson);
     
    //console.log(rarityList);

    rarityJson["rankings"] = rankings;

    fs.writeFileSync(`./collections/${collectionName}/metadata/rarity-counts.json`, JSON.stringify(rarityJson, null, 4));

}

function updateTraitTotals(){
    let filePath = `./collections/${collectionName}/metadata/trait-counts.json`;

    let raw = fs.readFileSync(filePath);
    let parsed = JSON.parse(raw);

    let keys = Object.keys(parsed);

    for(var i = 0; i < keys.length; i++){
        console.log(keys[i])

        let category = keys[i];
        let categoryMap = parsed[category];

        let categoryKeys = Object.keys(categoryMap);

        var total = 0;

        for(var j = 0; j < categoryKeys.length; j++){
            total += categoryMap[categoryKeys[j]];
        }

        categoryMap["total"] = total;



    }

    console.log(parsed)

    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 4));
}

calculateRarity()
