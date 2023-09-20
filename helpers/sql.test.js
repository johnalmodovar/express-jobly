"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function() {
  test("should work with provided data", function () {
    const sqlizedData = sqlForPartialUpdate({firstName: 'Aliya', age: 32},
    {firstName: "first_name",
     age: "age"});

    expect(sqlizedData). toEqual({setCols: '"first_name"=$1, "age"=$2',
                                  values: ['Aliya', 32]});
  });
  test("should not work without data to update", function (){

     expect(() => sqlForPartialUpdate({},
      {firstName: "first_name",
       age: "age"}).toThrow(BadRequestError));
  })
})

