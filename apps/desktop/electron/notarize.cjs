// electron-builder afterSign hook (CommonJS)
// - Signs are handled by electron-builder if cert is available (CSC_LINK/Keychain)
// - Notarization is triggered only when Apple credentials are present

const { notarize } = require("@electron/notarize");

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterSign(context) {
  // Only for mac builds
  if (context.electronPlatformName !== "darwin") return;

  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword =
    process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  // Safe default: don't break local builds if secrets are missing
  if (!appleId || !appleIdPassword || !teamId) {
    console.log(
      "[notarize] Skipping (missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD (or APPLE_ID_PASSWORD) / APPLE_TEAM_ID)"
    );
    return;
  }

  const appPath = `${appOutDir}/${appName}.app`;
  console.log(`[notarize] Notarizing ${appPath}...`);

  await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId
  });

  console.log("[notarize] Done");
};


