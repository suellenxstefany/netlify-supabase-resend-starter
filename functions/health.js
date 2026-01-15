// Netlify Function: basic health check
require("dotenv").config();

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      ok: true,
      service: "netlify-functions",
      timestamp: new Date().toISOString()
    })
  };
};
