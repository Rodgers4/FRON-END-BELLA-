const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 YOUR API KEYS
const GITHUB_API_KEY = "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";
const RENDER_API_KEY = "rnd_FyaVxdoK2JUYrX7Hjcet3SfJ2M5H";
const BASE_REPO = "Rodgers4/QUEEN-BELLA";

app.post("/deploy", async (req, res) => {
  const { username, sessionIdJson } = req.body;
  if (!username || !sessionIdJson) {
    return res.status(400).json({ error: "Missing username or session ID" });
  }

  try {
    const repoName = `queen-bella-${username}`;

    // 1. Create Private Repo
    const repoRes = await axios.post(
      "https://api.github.com/user/repos",
      { name: repoName, private: true },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_API_KEY}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    // 2. Copy template QUEEN BELLA code
    const contentRes = await axios.get(
      `https://api.github.com/repos/${BASE_REPO}/contents/index.js`,
      {
        headers: { Authorization: `Bearer ${GITHUB_API_KEY}` }
      }
    );

    const botCode = Buffer.from(contentRes.data.content, "base64").toString();

    // 3. Push index.js to new repo
    await axios.put(
      `https://api.github.com/repos/Rodgers4/${repoName}/contents/index.js`,
      {
        message: "Add QUEEN BELLA bot code",
        content: Buffer.from(botCode).toString("base64")
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_API_KEY}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    // 4. Push session.json to repo
    await axios.put(
      `https://api.github.com/repos/Rodgers4/${repoName}/contents/session.json`,
      {
        message: "Add session.json",
        content: Buffer.from(JSON.stringify(sessionIdJson, null, 2)).toString("base64")
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_API_KEY}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    // 5. Push package.json
    const pkgJson = {
      name: "queen-bella",
      version: "1.0.0",
      main: "index.js",
      scripts: { start: "node index.js" },
      dependencies: {
        "venom-bot": "^5.0.0"
      }
    };

    await axios.put(
      `https://api.github.com/repos/Rodgers4/${repoName}/contents/package.json`,
      {
        message: "Add package.json",
        content: Buffer.from(JSON.stringify(pkgJson, null, 2)).toString("base64")
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_API_KEY}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    // 6. Deploy to Render
    const deploy = await axios.post(
      "https://api.render.com/v1/services",
      {
        name: repoName,
        type: "background",
        repo: `https://github.com/Rodgers4/${repoName}`,
        branch: "main",
        startCommand: "npm start",
        rootDirectory: "."
      },
      {
        headers: {
          Authorization: `Bearer ${RENDER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      message: "Bot deployed",
      github: repoRes.data.html_url,
      render: deploy.data
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Deployment backend running on port ${PORT}`);
});
