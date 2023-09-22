"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/********************* POST /jobs ******************************************/

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 10,
    equity: 0,
    companyHandle: "c1"
  };

  test("ok for admins", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new",
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      }
    });
  });

  test("bad for non-admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
         message: "Unauthorized",
         status: 401}
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: 10,
          equity: 0,
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: 10,
          equity: "0",
          companyHandle: "doesn't exist",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************* GET /jobs *****************************************/

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "J1",
              salary: 10,
              equity: "0",
              companyHandle: "c1",
            },
            {
              id: expect.any(Number),
              title: "J2",
              salary: 20,
              equity: "0",
              companyHandle: "c2",
            },
            {
              id: expect.any(Number),
              title: "J3",
              salary: 30,
              equity: "1",
              companyHandle: "c3",
            },
          ],
    });
  });

  test("with title filter", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ title: "J1" });

    expect(resp.body).toEqual({
      jobs: [{
        id: expect.any(Number),
        title: "J1",
        salary: 10,
        equity: "0",
        companyHandle: "c1",
      }]
    });
  });

  test("with minSalary filter", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 30 });

    expect(resp.body).toEqual({
      jobs: [{
        id: expect.any(Number),
        title: "J3",
        salary: 30,
        equity: "1",
        companyHandle: "c3",
      }]
    });
  });

  test("with minSalary having an invalid integer", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minEmployees: "hi" });

    expect(resp.status).toEqual(400);
  });

  test("having multiple filter criteria", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({
            title: "j",
            minSalary: 20
        });

    expect(resp.body).toEqual({
      jobs: [
      {
        id: expect.any(Number),
        title: "J2",
        salary: 20,
        equity: "0",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "J3",
        salary: 30,
        equity: "1",
        companyHandle: "c3",
      }]
    });
  });
});

/*************************** GET /jobs/:id **********************************/

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app).get(`/jobs/${sampleId}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "J1",
        salary: 10,
        equity: "0",
        companyHandle: "c1",
      },
    });
  });

  //TODO: might make a test for a job without a job description?

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/78`);
    expect(resp.statusCode).toEqual(404);
  });

});

/******************************* PATCH /jobs/:id ****************************/

describe("PATCH /jobs/:id", function(){
  test("works for admins", async function (){
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app)
          .patch(`/jobs/${sampleId}`)
          .send({
            title: "New J1"
          })
          .set("authorization", `Bearer ${a1Token}`);

    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: 'New J1',
        salary: 10,
        equity: "0",
        companyHandle: "c1"
      }
    });

  })

  test("unauth for non-admin users", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app)
          .patch(`/jobs/${sampleId}`)
          .send({
            title: "New J1"
          })
          .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401}
    });
  })

  test("unauth for anon", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app)
          .patch(`/jobs/${sampleId}`)
          .send({
            title: "New J1"
          });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/10000`)
      .send({
        title: "New J1"
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on companyHandle change", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app)
          .patch(`/jobs/${sampleId}`)
          .send({
            companyHandle: 'c3'
          })
          .set("authorization", `Bearer ${a1Token}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app)
          .patch(`/jobs/${sampleId}`)
          .send({
            equity: 3
          })
          .set("authorization", `Bearer ${a1Token}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/*************************** DELETE /jobs/:id *********************/

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function (){
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;

    const resp = await request(app)
          .delete(`/jobs/${sampleId}`)
          .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({deleted: `${sampleId}`});
  });

  test("unauth for non-admin users", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;
    const resp = await request(app)
          .delete(`/jobs/${sampleId}`)
          .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      "error": {
        "message": "Unauthorized",
         "status": 401
        }
    });
  });

  test("unauth for anon", async function () {
    const sampleRes = await db.query( `
          SELECT id
          FROM jobs
          WHERE title = 'J1'
          `);
    const sampleId = sampleRes.rows[0].id;
    const resp = await request(app)
          .delete(`/jobs/${sampleId}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/10000`)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
