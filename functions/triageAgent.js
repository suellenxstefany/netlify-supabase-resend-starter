// SFTWR // AI Triage Agent v1.0 (Node.js)
// Operator: Nova

exports.handler = async (event) => {
  const data = JSON.parse(event.body);
  const MIN_BUDGET = 5000; // The SFTWR Floor
  let priorityScore = 0;

  const budget = data.budget || 0;
  const description = (data.description || "").toLowerCase();

  // 01 // Hard Boundary: Budget Alignment
  if (budget < MIN_BUDGET) {
    return {
      statusCode: 200, // Return 200 to handle the "Insufficient" redirect on the frontend
      body: JSON.stringify({ 
        status: "REJECTED", 
        reason: "RESOURCE_INSUFFICIENT",
        redirect: "/resource-insufficient.html" 
      }),
    };
  }

  // 02 // Complexity Scoring: Skillset Match
  // Weights reflect BAS: Network Security Forensics & CompTIA certs
  const highValueKeywords = {
    "forensics": 25,
    "rls": 20,
    "automation": 15,
    "ai": 15,
    "security audit": 20,
    "zero trust": 20,
    "infrastructure": 10
  };

  Object.keys(highValueKeywords).forEach(word => {
    if (description.includes(word)) {
      priorityScore += highValueKeywords[word];
    }
  });

  // 03 // Final Triage Decision
  let status = "LOW_PRIORITY";
  if (priorityScore >= 40) status = "HIGH_PRIORITY";
  else if (priorityScore >= 15) status = "MED_PRIORITY";

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: status,
      priority_score: priorityScore,
      operator_id: "NOVA_01"
    }),
  };
};
