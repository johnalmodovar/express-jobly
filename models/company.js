"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(`
        SELECT handle
        FROM companies
        WHERE handle = $1`, [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(`
                INSERT INTO companies (handle,
                                       name,
                                       description,
                                       num_employees,
                                       logo_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"`, [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Has OPTIONAL filters: nameLike, minEmployees, maxEmployees.
   * - nameLike - filter by company name that matches input (case-insensitive).
   * - minEmployees - filter to companies that have at least that num amount of
   *                  employees.
   * - maxEmployees - filter to companies that have no more than that num of
   *                  employees.
   *
   * if minEmployees is greater than maxEmployees, responds with 400 error.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filters) {
    if (filters) {
      const { nameLike, minEmployees, maxEmployees } = filters;
      const { whereString, values } = Company.filterCompanies(filters);
      const queryString =`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE ${whereString}
        ORDER BY name`;

      const filteredRes = await db.query(queryString, [...values]);

      return filteredRes.rows;
    }

    const companiesRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        ORDER BY name`);

    return companiesRes.rows;
  }

  /** Builds a query string and array of values for filtering company results
 * Takes in: {nameLike: 'and', minEmployees: 100, maxEmployees: 500}
 * Returns: { whereString: `name ILIKE '%' || $1 || '%'
 *                          AND num_employees >= $2
 *                          AND num_employees <= $3`,
 *             values: ['and', 100, 500] }
 */

static filterCompanies(filters) {
  const whereStringArray = [];
  let index = 1
  const { nameLike, minEmployees, maxEmployees } = filters;

  if (minEmployees > maxEmployees) {
    throw new BadRequestError(
              "minEmployees cannot be greater than maxEmployees");
  }
  if (nameLike) {
    whereStringArray.push(`name ILIKE '%' || $${index} || '%'`);
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

  return {
    whereString: whereStringArray.join(' AND '),
    values: Object.values(filters).filter(item => item !== undefined)
  };
}

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  /*
  SELECT handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url      AS "logoUrl"
        id,
        title,
        equity,
        company_handle AS "companyHandle"
  FROM companies
  JOIN jobs
  ON handle = company_handle
  WHERE handle = 1$

  then map results to condense into object

  */

  static async get(handle) {
    const companyRes = await db.query(`
      SELECT handle,
             name,
             description,
             num_employees AS "numEmployees",
             logo_url      AS "logoUrl"
      FROM companies
      WHERE handle = $1`,
    [handle]
    );

    let company = companyRes.rows[0]

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobRes = await db.query(`
      SELECT id,
             title
             salary,
             equity
      FROM jobs
      WHERE company_handle = $1`,
      [company.handle]);

    const jobArray = jobRes.rows;

    company.jobs = jobArray;





    //const company = companyRes.rows;

    // const company = companyRes.rows.map(({
    //   handle,
    //   name,
    //   description,
    //   num_employees,
    //   logo_url,
    //   id,
    //   title,
    //   equity,
    //   company_handle
    // }) => {
    //     let company = { handle, name, description, num_employees, logo_url };
    //     company["job"] = { id, title, equity, company_handle };
    //     return company;
    // });


    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE companies
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(`
        DELETE
        FROM companies
        WHERE handle = $1
        RETURNING handle`, [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
