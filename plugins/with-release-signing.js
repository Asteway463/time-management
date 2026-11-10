const { withAppBuildGradle } = require('@expo/config-plugins');

const DEBUG_SIGNING_BLOCK = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const RELEASE_SIGNING_BLOCK = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Never commit the keystore or its passwords. The properties file lives
            // outside the generated android/ directory so 'expo prebuild --clean'
            // does not delete it. CI can supply the same values as env vars.
            def keystoreProperties = new Properties()
            def keystorePropertiesFile = rootProject.file('../keystore.properties')
            if (keystorePropertiesFile.exists()) {
                keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
            }
            def releaseStoreFile = keystoreProperties.getProperty('storeFile') ?: System.getenv('ATHNAS_KEYSTORE_PATH')
            if (releaseStoreFile != null && !releaseStoreFile.trim().isEmpty()) {
                storeFile file(releaseStoreFile)
                storePassword keystoreProperties.getProperty('storePassword') ?: System.getenv('ATHNAS_KEYSTORE_PASSWORD')
                keyAlias keystoreProperties.getProperty('keyAlias') ?: System.getenv('ATHNAS_KEY_ALIAS')
                keyPassword keystoreProperties.getProperty('keyPassword') ?: System.getenv('ATHNAS_KEY_PASSWORD')
                enableV1Signing false
                enableV2Signing true
                enableV3Signing true
            }
        }
    }`;

const RELEASE_PACKAGING_GUARD = `
    // Fail closed: a release build must never silently fall back to the public
    // Android debug certificate. That is both a security defect and a Play
    // Protect trust signal.
    tasks.configureEach { task ->
        if (task.name == 'validateSigningRelease' || task.name == 'packageRelease') {
            task.doFirst {
                def config = android.signingConfigs.findByName('release')
                if (config == null || config.storeFile == null) {
                    throw new GradleException(
                        "Release signing is not configured. Create keystore.properties in the " +
                        "project root (next to package.json) or set ATHNAS_KEYSTORE_PATH, " +
                        "ATHNAS_KEYSTORE_PASSWORD, ATHNAS_KEY_ALIAS and ATHNAS_KEY_PASSWORD."
                    )
                }
            }
        }
    }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    if (contents.includes(DEBUG_SIGNING_BLOCK)) {
      contents = contents.replace(DEBUG_SIGNING_BLOCK, RELEASE_SIGNING_BLOCK);
    } else {
      throw new Error(
        'with-release-signing: could not find the generated debug signingConfigs block. ' +
        'Update the plugin for this Expo/React Native template.',
      );
    }

    // Replace only the signing config used by the release build type. Match the
    // exact generated block so the debug build type is never touched.
    const releaseBuildType = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;
    const releaseBuildTypeFixed = `        release {
            // Local and CI builds must use a private release key. EAS Build
            // injects its own release signing configuration.
            signingConfig signingConfigs.release`;

    if (contents.includes(releaseBuildType)) {
      contents = contents.replace(releaseBuildType, releaseBuildTypeFixed);
    } else {
      throw new Error(
        'with-release-signing: could not find the generated release buildType signingConfig. ' +
        'Update the plugin for this Expo/React Native template.',
      );
    }

    if (!contents.includes('signingConfig signingConfigs.release')) {
      throw new Error('with-release-signing: failed to point the release build type at the release keystore.');
    }

    if (!contents.includes('Release signing is not configured')) {
      contents = `${contents.trimEnd()}\n${RELEASE_PACKAGING_GUARD}`;
    }

    mod.modResults.contents = contents;
    return mod;
  });
};
