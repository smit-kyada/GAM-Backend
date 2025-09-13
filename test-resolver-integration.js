// Test file for resolver integration with AdManagerReport module
const { GenerateAdManagerReport } = require('./src/functions/AdManagerReport');

// Mock models and auth data
const mockModels = {
  Adsense: {
    findOne: () => Promise.resolve({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600000 // 1 hour from now
    })
  },
  Applog: {
    create: () => Promise.resolve({})
  },
  SiteTable: {
    findOneAndUpdate: () => Promise.resolve({})
  }
};

// Mock parameters
const mockDateRange = 'LAST_7_DAYS';
const mockDimensions = ['DATE', 'AD_EXCHANGE_DOMAIN'];
const mockMetrics = ['AD_EXCHANGE_ESTIMATED_REVENUE', 'AD_EXCHANGE_IMPRESSIONS'];

// Test function to simulate the resolver call
async function testResolver() {
  try {
    console.log('Testing resolver integration with AdManagerReport module...');
    
    // Get auth data
    const authData = await mockModels.Adsense.findOne({});
    console.log('Auth data retrieved:', authData ? 'Yes' : 'No');
    console.log('Access token present:', authData.access_token ? 'Yes' : 'No');
    
    if (!authData) {
      throw new Error('Authentication data not found');
    }
    
    // Call the GenerateAdManagerReport function with auth data
    console.log('Calling GenerateAdManagerReport with parameters:');
    console.log('- dateRange:', mockDateRange);
    console.log('- dimensions:', mockDimensions);
    console.log('- metrics:', mockMetrics);
    
    const result = await GenerateAdManagerReport(
      mockModels, 
      authData, 
      mockDateRange, 
      mockDimensions, 
      mockMetrics
    );
    
    console.log('GenerateAdManagerReport result:', result);
    return result;
  } catch (error) {
    console.error('Error in resolver test:', error);
    return { status: false, message: error.message };
  }
}

// Run the test
testResolver()
  .then(result => console.log('Test completed with result:', result))
  .catch(err => console.error('Test failed:', err));