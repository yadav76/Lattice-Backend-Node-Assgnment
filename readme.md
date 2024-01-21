# Project Name - Selection Test - Patient Register (NodeJS)

We have a platform where psychiatrists can register their patients through a mobile/ web portal. Each psychiatrist belongs to a hospital. We have provided the hospital list on the last page.(predefined list).

Minimum 5 psychiatrists work in a single hospital.

## Table of Contents

- [Libraries/Frameworks Used](#libraries-frameworks-used)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Setup and Usage](#setup-and-usage)
- [Postman/Swagger Documentation](#postman-swagger-documentation)
- [Contact](#Contact Information)

## Libraries/Frameworks Used

List of major libraries/frameworks used in the project:

- **Express.js**: A fast, unopinionated, minimalist web framework for Node.js.
- **dotenv**: Loads environment variables from a .env file into process.env.
- **mysql**: To connect with MYSQL database. Used to store persistent data into permanent Database.
- **nodemon**: To reload the app whenever their is change in app.

## API Endpoints

### Register Patient

- **Endpoint**: `/api/register`
- **Method**: `POST`
- **Request Body**:

  ```json
  {
    "name": "santosh",
    "address": "iit market powai",
    "email": "san@gmail.com",
    "phone": "+91233988999",
    "password": "Santosh@87",
    "photo": "afkdskfldskf",
    "psychiatristId": 1
  }
  ```

- **Response**:
  {
  "success": true,
  "patientId": 26
  }

### Get Hospital Details

    Endpoint: /api/hospital
    Method: `POST`

- **Request Body**:

```json
{
  "hospitalId": 4
}
```

- **Response**:
  {
  "success": true,
  "data": {
  "hospitalName": "AIIMS - All India Institute Of Medical Science",
  "totalPsychiatrists": 2,
  "totalPatients": 5,
  "psychiatristDetails": [
  {
  "Id": 4,
  "Name": "Dr. Brown",
  "PatientsCount": 3
  },
  {
  "Id": 8,
  "Name": "Dr. Adams",
  "PatientsCount": 2
  }
  ]
  }
  }

## Environment Variables

Make sure to change MYSQL_USERNAME, MYSQL_PASSWORD and MYSQL_DATABASE name in .env file to run the app successfully.

    PORT: Port on which the server will run.

    MYSQL_USERNAME = Mysql Username
    MYSQL_PASSWORD = Mysql Password
    MYSQL_DATABASE_NAME = Mysql Database Name

## Setup and Usage

    Clone the repository.
    Install dependencies using npm install.
    Start the server using node ./index.js Or npx nodemon.
    Access the API at http://localhost:3000 (or your specified port) in Postman.

## Postman Collection Documentation

    Postman Collection - I shave saved the PostMan Collection in this folder by Name of PostMan_Collection file. You can import it in your PostMan to see all the API I have made.

    Just Import "./PostMan_Collection" file in your PostMan from this folder.

## Contact Information

For inquiries or feedback, feel free to reach out:

- **Name**: Santosh Yadav
- **Email**: yadavsantosh6720@gmail.com
- **Phone**: 8779979321
