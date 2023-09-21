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
 * returns { id, title, salary, equity, company_handle }.
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
                    id,
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
   * Returns [{ id, title, salary, equity, companyHandle }]
   */

  static async findAll(filters) {
    if (filters) {
      const { title, minSalary, hasEquity } = filters;
      const { whereString, values } = Job.filterJobs(filters);

      const queryString = `
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle",
        FROM jobs
        WHERE ${whereString}
        ORDER BY title`;

      const filteredRes = await db.query(queryString, [...values]);

      return filteredRes.rows;
    }

    const jobRes = await db.query(
      `SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
       FROM jobs
       ORDER BY title`
    );

    return jobRes.rows;
  }

  /** Builds a query string and array of values for filtering job results
 * Takes in: {title: 'and', minSalary: 100, hasEquity: true}
 * Returns: { whereString: `title ILIKE '%' || $1 || '%'
 *                          AND salary >= $2
 *                          AND equity > 0`,
 *             values: ['and', 100] }
 */

  static filterJobs(filters) {
    const whereStringArray = [];
    let idx = 1;
    const { title, minSalary, hasEquity } = filters;

    if (title) {
      whereStringArray.push(`title ILIKE '%' || $${idx} || '%'`);
      idx++;
    }
    if (minSalary) {
      whereStringArray.push(`salary >= $${idx}`);
      idx++;
    }
    if (hasEquity) {
      whereStringArray.push(`equity > 0`);
      idx++;
    }

    return {
      whereString: whereStringArray.join(` AND `),
      values: Object.values(filters).filter(item => item !== undefined)
    };
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   */
}

module.exports = Job;