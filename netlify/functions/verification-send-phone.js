exports.handler = async (event) => {
    const { phone } = JSON.parse(event.body || '{}');
    
    if (!phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Phone number required' })
      };
    }
  
    // Simulate sending OTP
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requestId: 'mock-request-id-phone',
        phone: phone.replace(/.(?=.{2})/g, '*') // Mask number
      })
    };
  };
  