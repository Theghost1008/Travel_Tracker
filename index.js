import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
env.config();
const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = visited_countries.user_id WHERE users.id = $1",
  [currentUserId]);
    let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
async function getCurrentUser()
{
  const result = await db.query("SELECT * FROM users ");
  users = result.rows;
  return users.find((user)=> user.id == currentUserId);
  // return result.rows[0];
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const id = await getCurrentUser();
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1,$2)",
        [countryCode, id]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  //const a = req.body['user'];
  //const newUser = await db.query("INSERT INTO users VALUES($1,$2)",[a.name,a.color]);
  if (req.body.add === "new") { // "add"  is the name and it has value "new" 
    res.render("new.ejs");// when data is received for new user it is stored as key-value pair of add : new
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const col = req.body.color;

  const result = await db.query(
    "INSERT INTO users(name,color) VALUES ($1,$2) RETURNING *",
    [name,col]
  );
  const id = result.rows[0].id;
  currentUserId = id;
  res.redirect("/");
  /* Returning * means it will return a table of newly added values and rows[0] will contain the id of newly added user*/
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
