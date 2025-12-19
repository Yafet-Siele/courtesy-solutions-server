const hubspot = require("@hubspot/api-client");

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

async function sendToHubSpot(clientData) {
  try {
    // Search for an existing contact by email
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [{ propertyName: "email", operator: "EQ", value: clientData.email }]
        }
      ],
      properties: ["firstname", "phone", "message"]
    });

    const total = searchResponse?.body?.total ?? 0;

    if (total > 0) {
      // Contact exists → don't add it
      console.log(`Contact ${clientData.email} already in CRM — skipping`);
      return { success: true, synced: false, message: 'Contact already exists in CRM' };

    } else {
      // Contact does not exist → create new
      console.log(`Contact ${clientData.email} not in CRM — creating new contact`);

      const properties = {
        email: clientData.email,
        firstname: clientData.name,
        phone: clientData.number,
        message: clientData.message || ""
      };

      const createResponse = await hubspotClient.crm.contacts.basicApi.create({ properties });
      console.log("HubSpot Contact Created:", createResponse.id);
      return { success: true, data: createResponse, synced: true };
    }

  } catch (error) {
    console.error("HubSpot Error:", error.body || error.message);
    return { success: false, error: error.body || error.message };
  }
}

module.exports = { sendToHubSpot };