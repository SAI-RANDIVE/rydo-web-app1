exports.handler = async (event) => {
    const { email } = JSON.parse(event.body || '{}');
  
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Email address required' })
      };
    }
  
    // Simulate sending OTP
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requestId: 'mock-request-id-email',
        email: email.replace(/.(?=.{2}@)/g, '*') // Mask email
      })
    };
  };
  