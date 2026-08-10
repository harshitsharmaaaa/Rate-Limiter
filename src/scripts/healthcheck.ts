// Health check script for Docker HEALTHCHECK
async function healthCheck() {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || "localhost";

    const response = await fetch(`http://${host}:${port}/health`, {
      method: "GET",
    });

    if (response.ok) {
      process.exit(0);
    } else {
      console.error(`Health check failed with status: ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Health check failed:", error);
    process.exit(1);
  }
}

healthCheck();
