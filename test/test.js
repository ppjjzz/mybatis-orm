const mybatisMapper = require('../dist');
const path =  require('path');
mybatisMapper.createMapper(path.resolve(__dirname, './mapper'))
// console.log(myBatisMapper)
// SQL Parameters
var param = {
    name : null,
    category : 'banana',
    price : 500
  }
  
  var query = mybatisMapper.getStatement('fruit', 'testChoose', param);
  console.log(query);