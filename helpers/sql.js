"use strict";

const { BadRequestError } = require("../expressError");

/**
 * Transforms JS object of keys and values for updates into valid
 * SQL syntax and an array of values to be inserted.
 * Takes: 1. An object of keys and the values to which they should be set
 *          {firstName: 'Aliya', age: 32}
 *        2. An object whose keys are the field names in JS and whose values
 *            are the corresponding SQL column names.
 *            {firstName: "first_name",
 *             age: "age"}
 * Returns: An object with a set of columns, setCols, which is a string of
 *          saying which fields to set in the SQL query, with variables to
 *          prevent SQL injection. The values key is an array of the values
 *          that will be added to the DB in the update.
 *          e.g.: {setCols: '"first_name"=$1, "age"=$2',
 *                 values: ['Aliya', 32]}
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}


/** Builds a query string and array of values for filtering company results
 * Takes in: {nameLike: 'and', minEmployees: 100, maxEmployees: 500}
 * Returns: { whereString: `name ILIKE '%' || $1 || '%'
 *                          AND num_employees >= $2
 *                          AND num_employees <= $3`,
 *             values: ['and', 100, 500] }
 */
function sqlForFilter(termsToFilter) {

  const whereStringArray = [];
  let index = 1
  const { nameLike, minEmployees, maxEmployees } = termsToFilter;

  if (minEmployees > maxEmployees) {
    throw new BadRequestError(
              "minEmployees cannot be greater than maxEmployees");
  }

  if (nameLike) {
    whereStringArray.push(`name ILIKE '%' || $${index} || '%' `);
    index++;
  }
  if (minEmployees) {
    whereStringArray.push(`num_employees >= $${index}`);
    index++;
  }
  if (maxEmployees) {
    whereStringArray.push(`num_employees <= $${index}`);
    index++;
  }
  //const values = Object.values(termsToFilter);
  return {
    whereString: whereStringArray.join(' AND '),
    values: Object.values(termsToFilter).filter(item => item !== undefined)

  };

}

module.exports = { sqlForPartialUpdate, sqlForFilter };


