const hubspot = require("@hubspot/api-client");

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

async function sendToHubSpot(clientData) {
  try {
    // First, search for an existing contact by email
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [{ propertyName: "email", operator: "EQ", value: clientData.email }]
        }
      ],
      properties: ["firstname", "phone", "message", "submission_count"]
    });

    const total = searchResponse?.body?.total ?? 0;

    if (total > 0) {
      // Contact exists → increment submission_count
      const existing = searchResponse.body.results[0];
      const contactId = existing.id;
      const currentCount = Number(existing.properties.submission_count) || 0;
      const newCount = currentCount + 1;

      console.log(`Contact exists — incrementing submission_count to ${newCount}`);

      const updateResponse = await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: {
          firstname: clientData.name,
          phone: clientData.number,
          message: clientData.message || "",
          submission_count: newCount
        }
      });

      return updateResponse;

    } else {
      // Contact does not exist → create new
      const properties = {
        email: clientData.email,
        firstname: clientData.name,
        phone: clientData.number,
        message: clientData.message || "",
        submission_count: 1
      };

      const createResponse = await hubspotClient.crm.contacts.basicApi.create({ properties });
      console.log("HubSpot Contact Created:", createResponse.id);
      return createResponse;
    }

  } catch (error) {
    console.error("HubSpot Error:", error.body || error.message);
    throw error;
  }
}

module.exports = { sendToHubSpot };
