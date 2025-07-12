const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
require('dotenv').config();
require('./db');

app.use(cors());
app.listen(8080, function(){
  console.log("listning on 8080");
});

app.get('/pet', function(req, res){
  res.send('펫용품 쇼핑할 수 있는 페이지입니다.');
});
app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'index.html'));
  console.log((path.join(__dirname, 'index.html')));
});
