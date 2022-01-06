const fs = require('fs');
const request = require('request');

const collectionName = "apa";
let startingIndex = 0;
let endingIndex = 9999;

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

    for (let i = startingIndex; i < endingIndex + 1; i++) {
        let filePath = `./collections/${collectionName}/metadata/${i}.json`;
        let res = await doRequest(baseUrl, i)


        fs.writeFileSync(filePath, JSON.stringify(res, null, 4));

        collectionData[i] = res;
    }

    //fs.writeFileSync(`./collections/${collectionName}/metadata/full-collection.json`, JSON.stringify(collectionData, null, 4));
    
}

function getTraitTotals(collectionName, category){
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
    let parsedData = JSON.parse(rawData);
    return parsedData[category]["total"];
  }

async function calculateTotalNumberOfTraits(){
    let traits = {}

    let filePath = `./collections/${collectionName}/metadata/full-collection.json`;

    let raw = fs.readFileSync(filePath);
    let parsed = JSON.parse(raw);

    
    for (let i = startingIndex; i < endingIndex + 1; i++) {
        let tokenMap = parsed[i];

        let attributes = tokenMap["attributes"];

        for(var j = 0; j < attributes.length; j++){
            let traitMap = attributes[j];

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

    fs.writeFileSync(`./collections/${collectionName}/metadata/trait-counts.json`, JSON.stringify(traits, null, 4));

}

function findTraitByType(attributeList, type){
    for(var i = 0; i < attributeList.length; i++){
        if(attributeList[i]["trait_type"].toUpperCase() === type.toUpperCase()){
          return attributeList[i];
        }
      }
      return null;
}

async function calculateRarity(){
    let rarityList = []

    let fullCollectionPath = `./collections/${collectionName}/metadata/full-collection.json`;
    let rawCollectionData = fs.readFileSync(fullCollectionPath);
    let parsedCollectionData = JSON.parse(rawCollectionData);

    let rawTraitCountData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
    let parsedTraitCountData = JSON.parse(rawTraitCountData);

    let categories = Object.keys(parsedTraitCountData);

    for (let i = startingIndex; i < endingIndex; i++) {
        let tokenMap = parsedCollectionData[i];
        let attributes = tokenMap["attributes"];

        var tokenRarity = calculateRarityNumberOfTraits(attributes.length);

        for(let j = 0; j < categories.length; j++){
            var currentTrait = findTraitByType(attributes, categories[j]);
            if(currentTrait == null){
                currentTrait = {"trait_type":categories[j], "value":"None"};
            }
            
            let type = currentTrait["trait_type"];
            let value = currentTrait["value"];


            let count = parsedTraitCountData[type][value];
            let chance = count/10000;

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

    rarityJson["rankings"] = rankings;

    fs.writeFileSync(`./collections/${collectionName}/metadata/rarity-counts.json`, JSON.stringify(rarityJson, null, 4));

}

function updateTraitTotals(){
    let filePath = `./collections/${collectionName}/metadata/trait-counts.json`;

    let raw = fs.readFileSync(filePath);
    let parsed = JSON.parse(raw);

    let keys = Object.keys(parsed);

    for(var i = 0; i < keys.length; i++){

        let category = keys[i];
        let categoryMap = parsed[category];

        let categoryKeys = Object.keys(categoryMap);

        let total = 0;

        for(var j = 0; j < categoryKeys.length; j++){
            if(categoryKeys[j] === "total" || categoryKeys[j] === "None"){
                continue;
            }
            total += categoryMap[categoryKeys[j]];
        }
        categoryMap["total"] = total;
        categoryMap["None"] = 10000 - total;
    }

    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 4));
}

function calculateNumberOfTraitsPerToken(){
    let filePath = `./collections/${collectionName}/metadata/full-collection.json`;

    let raw = fs.readFileSync(filePath);
    let parsed = JSON.parse(raw);

    let countMap = {}

    for(var i = startingIndex; i < endingIndex; i++){
        let tokenMap = parsed[i];
        let traitCount = tokenMap["attributes"].length;
        if(countMap[traitCount] == null || countMap[traitCount] == undefined){
            countMap[traitCount] = 1;
        } else {
            countMap[traitCount] += 1;
        }
    }


    fs.writeFileSync(`./collections/${collectionName}/metadata/token-traits.json`, JSON.stringify(countMap, null, 4));

}

function calculateRarityNumberOfTraits(numberOfTraits){
    let filePath = `./collections/${collectionName}/metadata/token-traits.json`;

    let raw = fs.readFileSync(filePath);
    let parsed = JSON.parse(raw);

    return 1/(parsed[numberOfTraits] / endingIndex);



}

async function main(){
    console.log(`--Calculating traits for ${collectionName}--`);
    calculateTotalNumberOfTraits();
    console.log(`--Updating trait totals for ${collectionName}--`);
    updateTraitTotals();
    console.log(`--Calculating number of traits per token for ${collectionName}--`);
    calculateNumberOfTraitsPerToken();
    console.log(`--Calculating rarity for ${collectionName}--`);
    calculateRarity();
    
}

main()
