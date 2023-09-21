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
const Company = require("./company.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/******************************* create **************************************/

describe("create", function () {
  test("works", async function () {
    const newJob = {
      title: "new job",
      salary: 30,
      equity: "0",
      companyHandle: "c3"
    };
    let job = await Job.create(newJob);

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'new job'`
    );
    console.log("*** WHAT IS JOB ***", job)
    console.log("*** WHAT IS NEW JOB ***", newJob)

    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
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
        id: expect.any(Number),
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      },
      {
        id: expect.any(Number),
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
        id: expect.any(Number),
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
        id: expect.any(Number),
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
        id: expect.any(Number),
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
        id: expect.any(Number),
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
        id: expect.any(Number),
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
//FIXME: refactor job.get =>
describe("get", function () {

  test("works", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'j1'
          `);

    const sampleId = sampleRes.rows[0].id;

    let job = await Job.get(sampleId);

    expect(job).toEqual(
      {
        id: expect.any(Number),
        title: "j1",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      }
    );
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(-1);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/********************************** update ***********************************/

describe("update", function() {
  const updateData = {
    title: "new title",
    salary: 10000,
    equity: "0.5"
  };
  //FIXME: same idea with job id => refactor
  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      id: 1,
      title: "new title",
      salary: 10000,
      equity: "0.5",
      companyHandle: "c1"
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {id: 1,
      title: "new title",
      salary: 10000,
      equity: "0.5",
      company_handle: "c1"
    }
    ]);
  })

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "new title",
      salary: null,
      equity: null
    };
    //FIXME: refactor with id
    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      id: 1,
      ...updateDataSetNulls,
      companyHandle: "c1"
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
       FROM jobs
       WHERE id = 1`
    );
    //FIXME: refactor with id
    expect(result.rows).toEqual([{
      id: 1,
      title: "new title",
      salary: null,
      equity: null,
      company_handle: "c1"
    }]);
  })

  test("not found if no such job", async function () {
    try {
      await Job.update(999, updateData);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function() {
    try {
      await Job.update(1, {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/***************************remove******************************** */
//FIXME: refactor with id
describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query(
      `SELECT id FROM jobs WHERE id=1`
    );
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function (){
    try {
      await Job.remove(999);
      throw new Error("fail test; you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("should be deleted if company is deleted", async function(){
    await Company.remove("c1");
    const res = await db.query(
      `SELECT id FROM jobs WHERE company_handle = 'c1'`
    );
    expect(res.rows.length).toEqual(0);
  })
});