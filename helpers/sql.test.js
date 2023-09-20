"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate, sqlForFilter } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("should work with provided data", function () {
    const sqlizedData = sqlForPartialUpdate(
      { firstName: "Aliya", age: 32 },
      { firstName: "first_name", age: "age" }
    );

    expect(sqlizedData).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ["Aliya", 32],
    });
  });

  test("should not work without data to update", function () {
    expect(() =>
      sqlForPartialUpdate({}, { firstName: "first_name", age: "age" }).toThrow(
        BadRequestError
      )
    );
  });
});


describe("sqlForFilter", function () {
  test("should work with provided data", function () {
    const sqlFilter = sqlForFilter({
      nameLike: "and",
      minEmployees: 100,
      maxEmployees: 500,
    });

    expect(sqlFilter).toEqual({
      whereString:
        `name ILIKE '%' || $1 || '%'`
        + ` AND num_employees >= $2`
        + ` AND num_employees <= $3`,
      values: ["and", 100, 500],
    });
  });

  test("only some criteria are inputted", function () {
    const sqlFilter = sqlForFilter({
      nameLike: "and",
      minEmployees: 100,
    });

    expect(sqlFilter).toEqual({
      whereString:
        `name ILIKE '%' || $1 || '%'`
        + ` AND num_employees >= $2`,
      values: ["and", 100],
    });
  });

});
