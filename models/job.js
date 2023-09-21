"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
/** Create a job (from data), update db, return new job data.
 *
 * data should be { title, salary, equity, company_handle }.
 *
 * returns { title, salary, equity, company_handle }.
 *
 * Throws BadRequestError if job is already in database.
 */

  static async create({ title, salary, equity, companyHandle }) {
    // const duplicateCheck = await db.query(`
    //     SELECT title, company_handle AS "companyHandle"
    //     FROM jobs
    //     WHERE companyHandle = $1`, [companyHandle]);

    //   if (duplicateCheck.rows[0])
    //   throw new BadRequestError(`Duplicate job: ${title}`);

    //TODO: create checker for if company handle exists
    //      throws BadRequestError if not found

    const result = await db.query(`
                INSERT INTO jobs (title,
                                  salary,
                                  equity,
                                  company_handle)
                VALUES ($1, $2, $3, $4)
                RETURNING
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"`,
                [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Has OPTIONAL filters: title, minSalary, hasEquity.
   * - title: filters by job title that matches input (case-insensitive).
   * - minSalary: filter jobs with at least that num salary.
   * - hasEquity: if true, filter jobs that provide non-zero amount of equity.
   *              if false (or not included), list all jobs regardless equity.
   *
   * Returns [{ title, salary, equity, companyHandle }]
   */
}

module.exports = Job;