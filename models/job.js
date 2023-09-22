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

    const companyCheck = await db.query(`
              SELECT handle
              FROM companies
              WHERE handle = $1`, [companyHandle]);

    if (!companyCheck.rows[0]) {
      throw new BadRequestError(`Nonexistent company: ${companyHandle}`);
    }

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
               company_handle AS "companyHandle"
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
      whereStringArray.push(`equity != 0`);
      idx++;
    }
    if (!hasEquity) {
      whereStringArray.push(`equity >= 0`);
      idx++;
    }

    let values = [title, minSalary];
    //let whereString = whereStringArray.join(` AND `);

    return {
      whereString: whereStringArray.join( ' AND '),
      values: values.filter(item => item !== undefined)
    };
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   */

  static async get(id) {
    const jobRes = await db.query(`
      SELECT id,
             title,
             salary,
             equity,
             company_handle AS "companyHandle"
      FROM jobs
      WHERE id = $1`, [id]);

    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job for id: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data,
      {companyHandle: "company_handle"});

    const idVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE jobs
        SET ${setCols}
        WHERE id = ${idVarIdx}
        RETURNING
              id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"`;

    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job for id ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(`
        DELETE
        FROM jobs
        WHERE id = $1
        RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job for id ${id}`);

  }
}

module.exports = Job;