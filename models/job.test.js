"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/******************************* create **************************************/

describe("create", function () {
  const newJob = {
    title: "new job",
    salary: 30,
    equity: "0",
    companyHandle: "c3"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'new job'`
    );
    expect(result.rows).toEqual([
      {
        title: "new job",
        salary: 30,
        equity: "0",
        company_handle: "c3"
      }
    ]);
  });

  test("bad request", async function () {
    try {
      await Job.create({
        title: "bad job",
        salary: 30,
        equity: "0",
        companyHandle: "company that doesn't exist"
      });
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      console.log("HELLO ERROR", err)
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

});

/******************************** findAll ************************************/

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();

    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      },
      {
        title: "j2",
        salary: 20,
        equity: "1",
        companyHandle: "c2"
      }
    ]);
  });

  test("works with title filter", async function () {
    const mockQuery1 = { title: "j1" }
    let jobs = await Job.findAll(mockQuery1);

    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      }
    ]);
  });

  test("works with minSalary filter", async function () {
    const mockQuery2 = { minSalary: 20 };
    let jobs = await Job.findAll(mockQuery2);

    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 20,
        equity: "1",
        companyHandle: "c2"
      }
    ]);
  });

  test("works with hasEquity filter that's true", async function () {
    const mockQuery3 = { hasEquity: true };
    let jobs = await Job.findAll(mockQuery3);

    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 20,
        equity: "1",
        companyHandle: "c2"
      }
    ]);
  });

  test("works with hasEquity filter that's false", async function () {
    const mockQuery3 = { hasEquity: false };
    let jobs = await Job.findAll(mockQuery3);

    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      }
    ]);
  });

  test("works with multiple filters", async function () {
    const mockQuery4 = { title: "j2", hasEquity: true };
    let jobs = await Job.findAll(mockQuery4);

    expect(jobs).toEqual([
      {
        title: "j2",
        salary: 20,
        equity: "1",
        companyHandle: "c2"
      }
    ]);
  });

  test("returns empty array if no jobs match", async function () {
    const mockQuery5 = { title: "no job exists with this title" };
    let jobs = await Job.findAll(mockQuery5);

    expect(jobs).toEqual([]);
  });

});

/***************************** filterJobs ************************************/

describe("filterJobs", function () {
  test("should work with provided data", function () {
    const sqlFilter = Job.filterJobs({
      title: "title",
      minSalary: 10,
      hasEquity: true,
    });

    expect(sqlFilter).toEqual(
      {
        whereString:
          `title ILIKE '%' || $1 || '%'`
          + ` AND salary >= $2`
          + ` AND equity > 0`,
        values: ["title", 10],
      }
    );
  });

  test("only some criteria are inputted", function () {
    const sqlFilter = Job.filterJobs(
      {
        title: "title",
        minSalary: 10,
      }
    );

    expect(sqlFilter).toEqual(
      {
        whereString:
        `title ILIKE %' || $1 || '%'`
        + ` AND salary >= $2`,
        values: ["title", 10],
      }
    );
  });

});

/****************************** get ******************************************/

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("j1");

    expect(job).toEqual(
      {
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      }
    );
  });

  test("not fonud if no such job", async function () {
    try {
      await Job.get("doesn't exist");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/********************************** update ***********************************/
//TODO: where we left off => pattern match company.test.js