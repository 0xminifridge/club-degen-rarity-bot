const express = require('express');
const server = express();

server.all('/', (req, res)=>{
    res.send('Your bot is alive!')
})

server.set('PORT', process.env.PORT || 8080);

function keepAlive(){
    server.listen(server.get('PORT'), () => console.log(`Node server listening on port ${server.get('PORT')}!`));
    return server.get('PORT');
}

function getPort(){
    return server.get('PORT');
}

module.exports.keepAlive = keepAlive;
module.exports.getPort = getPort;