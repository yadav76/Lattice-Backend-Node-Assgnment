const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const mysql = require("mysql2");
require("dotenv").config(); //to use enviornment variable in our app

const app = express();
const port = process.env.Port || 3000;

app.use(bodyParser.json());

// Multer configuration for handling file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create MySQL Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// Validation middleware
const validatePatientData = (req, res, next) => {
  const { name, address, email, phone, password, psychiatristId } = req.body;

  if (psychiatristId <= 0) {
    console.log("hii");
    return res.status(400).json({
      success: false,
      error: "PsychiatrisId should not be 0 or less then 0",
    });
  }

  if (!name || !address || !email || !phone || !password || !psychiatristId) {
    return res
      .status(400)
      .json({ success: false, error: "All fields are required." });
  }

  if (address.length < 10) {
    return res.status(400).json({
      success: false,
      error: "Address should be at least 10 characters.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid email address." });
  }

  const phoneRegex = /^\+\d{1,3}\d{9,}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid phone number format." });
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,15}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      error:
        "Password must contain one upper character, one lower character, one number, and one special character. Minimum length: 8, Maximum length: 15.",
    });
  }

  next();
};

// Endpoint for patient registration
app.post("/api/register", validatePatientData, (req, res) => {
  const { name, address, email, phone, password, photo, psychiatristId } =
    req.body;

  // Insert patient data into MySQL database
  const insertQuery =
    "INSERT INTO patients (name, address, email, phone, password, photo, psychiatristId) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [name, address, email, phone, password, photo, psychiatristId];

  connection.query(insertQuery, values, (error, results) => {
    if (error) {
      console.error("Error inserting patient data:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    res.status(201).json({ success: true, patientId: results.insertId });
  });
});

// Endpoint to fetch psychiatrists and patient details for a hospital
app.post("/api/hospital", (req, res) => {
  const { hospitalId } = req.body;

  //if hospitalId is <= 0 || > 4 then return error
  if (hospitalId <= 0 || hospitalId > 4) {
    return res.status(400).json({
      success: false,
      error: "Hospital ID should be Greater then 0 and Less then 4!",
    });
  }

  //If hospitalId not provided then return error
  if (!hospitalId) {
    return res.status(400).json({
      success: false,
      error: "Hospital ID is required in the request body.",
    });
  }

  // Fetch psychiatrists and patient details for the given hospital
  const query = `
    SELECT
      h.name AS hospitalName,
      COUNT(DISTINCT p.psychiatristId) AS totalPsychiatrists,
      COUNT(DISTINCT pd.patientId) AS totalPatients,
      GROUP_CONCAT(DISTINCT p.psychiatristId) AS psychiatristIds
    FROM
      hospitals h
    LEFT JOIN psychiatrists p ON h.hospitalId = p.hospitalId
    LEFT JOIN patients pd ON p.psychiatristId = pd.psychiatristId
    WHERE
      h.hospitalId = ?
    GROUP BY
      h.hospitalId;
  `;

  connection.query(query, [hospitalId], (error, results) => {
    if (error) {
      console.error("Error fetching data:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Hospital not found or has no data." });
    }

    const { hospitalName, totalPsychiatrists, totalPatients, psychiatristIds } =
      results[0];

    // Fetch detailed information for each psychiatrist
    const psychiatristDetailsQuery = `
      SELECT
        p.psychiatristId AS Id,
        p.name AS Name,
        COUNT(pd.patientId) AS PatientsCount
      FROM
        psychiatrists p
      LEFT JOIN patients pd ON p.psychiatristId = pd.psychiatristId
      WHERE
        p.psychiatristId IN (${psychiatristIds})
      GROUP BY
        p.psychiatristId;
    `;

    connection.query(
      psychiatristDetailsQuery,
      (detailsError, detailsResults) => {
        if (detailsError) {
          console.error("Error fetching psychiatrist details:", detailsError);
          return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
        }

        const psychiatristDetails = detailsResults.map((detail) => ({
          Id: detail.Id,
          Name: detail.Name,
          PatientsCount: detail.PatientsCount,
        }));

        const apiResponse = {
          hospitalName,
          totalPsychiatrists,
          totalPatients,
          psychiatristDetails,
        };

        res.status(200).json({ success: true, data: apiResponse });
      }
    );
  });
});

// Function to check if Default data is already present
function isInitialDataPresent(callback) {
  const hospitalsQuery = "SELECT * FROM hospitals LIMIT 1";
  connection.query(hospitalsQuery, (error, results) => {
    if (error) {
      console.error("No Default Data Present");
      return callback(false);
    }

    // If there is at least one row in the hospitals table, initial data is already present
    callback(results.length > 0);
  });
}

// Check if initial data is already present
isInitialDataPresent((initialDataPresent) => {
  if (!initialDataPresent) {
    console.log("Initializing database with Default data...");

    //create tables into database for first time
    createHospitalTable();
    createPatientsTable();
    createPsychiatristsTable();
  } else {
    console.log("Default data is already present. Skipping initialization.");
  }
});

//create Default Hospital Table for first time of Execution
function createHospitalTable() {
  const createHospitalsTableQuery = `
    CREATE TABLE IF NOT EXISTS hospitals (
      hospitalId INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    )
`;

  executeSqlQuries(createHospitalsTableQuery);

  const addDefaultDataInHospitalsTableQuery = `
  INSERT INTO hospitals (hospitalId, name) VALUES
  (1, 'Apollo Hospitals'),
  (2, 'Jawaharlal Nehru Medical College and Hospital'),
  (3, 'Indira Gandhi Institute of Medical Sciences (IGIMS)'),
  (4, 'AIIMS - All India Institute Of Medical Science');`;

  executeSqlQuries(addDefaultDataInHospitalsTableQuery);
}

// Create psychiatrists table if not exists for 1st time
function createPsychiatristsTable() {
  const createPsychiatristsTableQuery = `
    CREATE TABLE IF NOT EXISTS psychiatrists (
      psychiatristId INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      hospitalId INT
    );
`;

  //create Psychiatrists Table
  executeSqlQuries(createPsychiatristsTableQuery);

  const addDataDefaultDataInPsychiatristsTableQuery = `
  INSERT INTO psychiatrists (name, hospitalId) VALUES
    ('Dr. Smith', 1),
    ('Dr. Johnson', 2),
    ('Dr. Williams', 3),
    ('Dr. Brown', 4),
    ('Dr. Davis', 1),
    ('Dr. Taylor', 2),
    ('Dr. Martinez', 3),
    ('Dr. Adams', 4),
    ('Dr. Foster', 1),
    ('Dr. Murphy', 2)`;

  //add Default Data in Pyschiatists Table
  executeSqlQuries(addDataDefaultDataInPsychiatristsTableQuery);
}

// Create patients table if not exists for 1st time
function createPatientsTable() {
  const createPatientsTableQuery = `
    CREATE TABLE IF NOT EXISTS patients (
      patientId INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(15) NOT NULL,
      password VARCHAR(15) NOT NULL,
      photo VARCHAR(255),
      psychiatristId INT
    )
    `;

  executeSqlQuries(createPatientsTableQuery);

  const addDataInPatientTable = `
  INSERT INTO patients (name, address, email, phone, password, photo, psychiatristId) VALUES
  ('John Doe', '123 Main St', 'john.doe@example.com', '+12345678901', SUBSTRING('pass123', 1, 15), 'base64encodedphoto1', 1),
  ('Jane Smith', '456 Oak St', 'jane.smith@example.com', '+23456789012', SUBSTRING('securepwd456', 1, 15), 'base64encodedphoto2', 1),
  ('Alice Johnson', '789 Maple St', 'alice.johnson@example.com', '+34567890123', SUBSTRING('myp@ssword789', 1, 15), 'base64encodedphoto3', 2),
  ('Bob Anderson', '567 Pine St', 'bob.anderson@example.com', '+45678901234', SUBSTRING('strongPWD789', 1, 15), 'base64encodedphoto4', 3),
  ('Eva Miller', '890 Cedar St', 'eva.miller@example.com', '+56789012345', SUBSTRING('secretp@ss123', 1, 15), 'base64encodedphoto5', 3),
  ('Michael White', '234 Elm St', 'michael.white@example.com', '+67890123456', SUBSTRING('mike_pass123', 1, 15), 'base64encodedphoto6', 4),
  ('Olivia Davis', '789 Birch St', 'olivia.davis@example.com', '+78901234567', SUBSTRING('oliviaPWD789', 1, 15), 'base64encodedphoto7', 4),
  ('Charlie Garcia', '901 Walnut St', 'charlie.garcia@example.com', '+89012345678', SUBSTRING('charlie_pass', 1, 15), 'base64encodedphoto8', 5),
  ('Sophia Wilson', '345 Spruce St', 'sophia.wilson@example.com', '+90123456789', SUBSTRING('sophiaPWD456', 1, 15), 'base64encodedphoto9', 5),
  ('Liam Turner', '678 Oak St', 'liam.turner@example.com', '+12345678901', SUBSTRING('liam_password', 1, 15), 'base64encodedphoto10', 6),
  ('Ava Martinez', '123 Maple St', 'ava.martinez@example.com', '+23456789012', SUBSTRING('ava_securepwd', 1, 15), 'base64encodedphoto11', 6),
  ('Lucas Taylor', '456 Cedar St', 'lucas.taylor@example.com', '+34567890123', SUBSTRING('lucas_pass123', 1, 15), 'base64encodedphoto12', 7),
  ('Emma Hernandez', '789 Pine St', 'emma.hernandez@example.com', '+45678901234', SUBSTRING('emma_strongPWD', 1, 15), 'base64encodedphoto13', 7),
  ('Mia Adams', '234 Birch St', 'mia.adams@example.com', '+56789012345', SUBSTRING('mia_secretPWD', 1, 15), 'base64encodedphoto14', 8),
  ('Noah Russell', '567 Elm St', 'noah.russell@example.com', '+67890123456', SUBSTRING('noah_mike_pass', 1, 15), 'base64encodedphoto15', 8),
  ('Ella Foster', '890 Walnut St', 'ella.foster@example.com', '+78901234567', SUBSTRING('ella_oliviaPWD', 1, 15), 'base64encodedphoto16', 9),
  ('Jackson Reed', '123 Spruce St', 'jackson.reed@example.com', '+89012345678', SUBSTRING('jackson_charlie_pass', 1, 15), 'base64encodedphoto17', 9),
  ('Aria Wright', '345 Oak St', 'aria.wright@example.com', '+90123456789', SUBSTRING('aria_sophiaPWD', 1, 15), 'base64encodedphoto18', 10),
  ('Ethan Cooper', '678 Cedar St', 'ethan.cooper@example.com', '+12345678901', SUBSTRING('ethan_liam_password', 1, 15), 'base64encodedphoto19', 10),
  ('Isabella Peterson', '901 Maple St', 'isabella.peterson@example.com', '+23456789012', SUBSTRING('isabella_ava_securepwd', 1, 15), 'base64encodedphoto20', 1),
  ('Aiden Murphy', '234 Elm St', 'aiden.murphy@example.com', '+34567890123', SUBSTRING('aiden_lucas_pass123', 1, 15), 'base64encodedphoto21', 2),
  ('Scarlett Bell', '567 Pine St', 'scarlett.bell@example.com', '+45678901234', SUBSTRING('scarlett_emma_strongPWD', 1, 15), 'base64encodedphoto22', 3),
  ('Grayson Cook', '890 Cedar St', 'grayson.cook@example.com', '+56789012345', SUBSTRING('grayson_mia_secretPWD', 1, 15), 'base64encodedphoto23', 4),
  ('Lily Butler', '123 Walnut St', 'lily.butler@example.com', '+67890123456', SUBSTRING('lily_noah_mike_pass', 1, 15), 'base64encodedphoto24', 5),
  ('Logan Price', '456 Birch St', 'logan.price@example.com', '+78901234567', SUBSTRING('logan_ella_oliviaPWD', 1, 15), 'base64encodedphoto25', 6);
`;

  //add default data in Patient Table
  executeSqlQuries(addDataInPatientTable);
}

//function to execute SQL quires
function executeSqlQuries(sqlQuery) {
  connection.query(sqlQuery, (error) => {
    if (error) {
      console.error("Error in Executing the Query:", error);
    } else {
      console.log("Query Executes successfully");
      // connection.end();
    }
  });
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
