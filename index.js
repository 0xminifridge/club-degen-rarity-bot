var Discord = require('discord.js');
const fs = require('fs');
const querystring = require('querystring');

const keepAlive = require('./keep_alive.js')

keepAlive.keepAlive();

var port = keepAlive.getPort()

const client = new Discord.Client({
    autorun: true
});

if(port == "8080"){
  var auth = require(
      './auth.json'
  )

  client.login(auth.rarityToken)
} else {
  client.login(process.env.RARITY_TOKEN);
}


function readFullCollection(collectionName){
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/full-collection.json`);
    let parsedData = JSON.parse(rawData);
    return parsedData;
}

function getAttributes(collectionName, tokenId){
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/full-collection.json`);
    let parsedData = JSON.parse(rawData);
    let attributes = parsedData[tokenId]["attributes"];
    return attributes;
}

function getCategories(collectionName){
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
    let parsedData = JSON.parse(rawData);
    return Object.keys(parsedData);
}

function getTokenName(collectionName, tokenId){
  let parsedData = readFullCollection(collectionName);
  let name = parsedData[tokenId]["name"];
  return (name == null || name == undefined ? parsedData[tokenId]["description"] + " #" + tokenId : name);
}

function getTraitType(jsonMap){
  return jsonMap["trait_type"];
}

function getTraitValue(jsonMap){
  return jsonMap["value"];
}

function findTraitByType(attributeList, type){
  for(var i = 0; i < attributeList.length; i++){
    if(getTraitType(attributeList[i]).toUpperCase() === type.toUpperCase()){
      return attributeList[i];
    }
  }
  return null;
}

function getTraitPoints(jsonMap){
  return (jsonMap["points"] == null || jsonMap["points"] == undefined ? "N/A" : jsonMap["points"]);
}

function getTraitCounts(collectionName){
  let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
  let parsedData = JSON.parse(rawData);
  return parsedData;
}

function getTraitChance(collectionName, jsonMap){
  let type = getTraitType(jsonMap);
  let value = getTraitValue(jsonMap);

  let count = getTraitCounts(collectionName)[type][value];
  let chance = count/(getCollectionSize(collectionName));
  return chance;
}

function getFormattedTraitChance(collectionName, jsonMap){
  return (getTraitChance(collectionName, jsonMap) *100).toFixed(2);
}

function getTraitRarity(collectionName, jsonMap){
  let chance = getTraitChance(collectionName, jsonMap);
  return 1/(chance);
}

function getCollectionSize(collectionName){
  let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/full-collection.json`);
  let parsedData = JSON.parse(rawData);
  return Object.keys(parsedData).length;
}

function getTraitTotals(collectionName, category){
  let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
  let parsedData = JSON.parse(rawData);
  return parsedData[category]["total"];
}

function getNumberOfTraits(collectionName, numberOfTraits){
  let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/token-traits.json`);
  let parsedData = JSON.parse(rawData);
  return parsedData[numberOfTraits]/getCollectionSize(collectionName);
}

function getImagePath(collectionName, tokenId){
  try{
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/full-collection.json`);
    let parsedData = JSON.parse(rawData);
    let imageUrl = parsedData[tokenId]["image"].replace(/ /g, "%20");
    if(imageUrl.includes("ipfs")){
      let imageList = imageUrl.split("/");
      return "https://gateway.pinata.cloud/ipfs/" + imageList[imageList.length - 2] + "/" + imageList[imageList.length - 1];
    } else {
      return imageUrl;
    }
  } catch(err){
    console.log(err);
  }
}

function getRarityCount(collectionName, tokenId){
  try{
    let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/rarity-counts.json`);
    let parsedData = JSON.parse(rawData)["rankings"];
    return parsedData.indexOf(Number(tokenId)) + 1;
  } catch(err){
    console.log(err);
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getStartingIndex(collectionName){
  let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/full-collection.json`);
  let parsedData = JSON.parse(rawData);
  return Object.keys(parsedData)[0];
}

function findNullCategoryValue(collectionName, category){
  let rawData = fs.readFileSync(`./collections/${collectionName}/metadata/trait-counts.json`);
  let parsedData = JSON.parse(rawData);

  let totals = parsedData[category]["total"];
  let totalSize = getCollectionSize(collectionName);

  return totalSize - totals;
}


async function sendEmbededMessagePriceInfo(channel, collectionName, tokenId){

  let attributes = getAttributes(collectionName, tokenId);
  console.log("Attributes");
  console.log(attributes)

  let categories = getCategories(collectionName);

  var rarityScore = getNumberOfTraits(collectionName, attributes.length);
  console.log(rarityScore);

  const exampleEmbed = new Discord.MessageEmbed()
	.setColor('#fc2c03') // red
	.setTitle(`${getTokenName(collectionName, tokenId)}`)
  .setImage(getImagePath(collectionName, tokenId))
	.setTimestamp()

  for(var i = 0; i < categories.length; i++){
    //console.log(`Category: ${categories[i]}`)
    var currentTrait = findTraitByType(attributes, categories[i]);
    //console.log("processing " + currentTrait)
    if(currentTrait == null){
      // handle finding null percentage of trait
      //console.log(`Cannot find category (${categories[i]}. Using nulls)`)
      //console.log(findNullCategoryValue(collectionName, categories[i]))
      currentTrait = {"trait_type":categories[i], "value":"None"};
    }
    let traitRarity = getTraitRarity(collectionName, currentTrait);
    rarityScore += traitRarity;
    console.log(`${currentTrait["trait_type"]}: ${currentTrait["value"]} - ` + getTraitRarity(collectionName, currentTrait))
    if(i < 6){
      if(i == 0){
        exampleEmbed.fields.push({ name: `${capitalizeFirstLetter(categories[i])}`, value: `${getTraitValue(currentTrait)}`, inline: true},
          { name: 'Chance', value: `${getFormattedTraitChance(collectionName, currentTrait)}%`, inline: true},
          { name: 'Points', value: `+${traitRarity.toFixed(2)}`, inline: true},
        );
      } else {
        exampleEmbed.fields.push({ name: `${capitalizeFirstLetter(categories[i])}`, value: `${getTraitValue(currentTrait)}`, inline: true},
            { name: '\u200b', value: `${getFormattedTraitChance(collectionName, currentTrait)}%`, inline: true},
            { name: '\u200b', value: `+${traitRarity.toFixed(2)}`, inline: true},
        );
      }
    }
  }

  console.log(`Total Rarity: ${rarityScore}`)

  exampleEmbed.fields.push(
    { name: '-------------------', value: '\u200b', inline: true},
    { name: '-------------------', value: '\u200b', inline: true},
    { name: '-------------------', value: '\u200b', inline: true}
    )

    exampleEmbed.fields.push(
      { name: 'Rarity', value: `${rarityScore.toFixed(2)}`, inline: true},
      { name: 'Rank', value: `${getRarityCount(collectionName, tokenId)}`, inline: true},
      //{ name: '\u200b', value: '\u200b', inline: true}
      )


  channel.send(exampleEmbed);
}

let validCollections = [
  "avax-apes",
  "apa",
  "chikn",
]

client.on("ready", () => {
  console.log("Starting bot...");
})



client.on("message", function (message) {
  if(message.content.substring(0, 1) == '?'){
    var args = message.content.substring(1).split(' ');
    var cmd = args[0];
    args = args.splice(1);
    switch(cmd){
      // ?rarity avax-apes 1
      case "rarity":
          if(args[0] == null || args[0] == undefined){
            message.reply("No collection specified");
          } else if(!validCollections.includes(args[0])){
            message.reply(`Invalid collection specified: ${args[0]}`);
          } else {
            if(args[1] == null || args[1] < getStartingIndex(args[0]) || args[1] > getCollectionSize(args[0]) || Number.isNaN(+args[1])){
              message.reply("Please enter a valid token id. Ex: ?rarity <collection> <id>")
            } else {
                sendEmbededMessagePriceInfo(message.channel, args[0], args[1]);
            }
          }
          break;
      case "supported":
        message.reply("Current supported collections:\n\n" + validCollections);
    }
  }
})