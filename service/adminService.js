// @TODO use this adminService file once Snyk Code for VSCode
// is able to navigate to cross-file paths in the vuln description 
/** 
module.exports.adminLoginSuccess = function(redirectPage, res) {
    const utils = require('../utils')
    console.log({redirectPage})

    // Only allow in-app redirects to avoid open-redirects.
    return res.redirect(utils.safeRedirectPath(redirectPage, '/admin'))
}
*/