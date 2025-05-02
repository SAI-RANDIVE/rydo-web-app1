exports.handler = async (event) => {
    const { requestId, otp } = JSON.parse(event.body || '{}');
  
    if (!requestId || !otp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Request ID and OTP are required' })
      };
    }
  
    // For demo: accept OTP '123456'
    if (otp === '123456') {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, verified: true })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, verified: false, message: 'Incorrect OTP' })
      };
    }
  };
  