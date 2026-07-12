plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Populated from env vars so the keystore/passwords never need to be
// committed. Left false when RELEASE_STORE_FILE isn't set OR doesn't point
// to a real file (CI can set the env var whether or not the keystore secret
// was actually provided, e.g. on PRs from forks) - the release buildType
// below falls back to debug signing in that case, so `gradle assembleRelease`
// still works with no signing setup at all.
val releaseStoreFilePath: String? = System.getenv("RELEASE_STORE_FILE")
val hasReleaseKeystore = !releaseStoreFilePath.isNullOrBlank() && file(releaseStoreFilePath).exists()

logger.lifecycle(
    "karopon: release build type will be signed with " +
        if (hasReleaseKeystore) "the release keystore ($releaseStoreFilePath)" else "the debug key",
)

android {
    namespace = "cc.headpats.karopon"
    compileSdk = 34

    defaultConfig {
        applicationId = "cc.headpats.karopon"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }
    }

    signingConfigs {
        create("release") {
            if (hasReleaseKeystore) {
                storeFile = file(releaseStoreFilePath!!)
                storePassword = System.getenv("RELEASE_STORE_PASSWORD")
                keyAlias = System.getenv("RELEASE_KEY_ALIAS")
                keyPassword = System.getenv("RELEASE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    // The .so files here come from cross-compiling android/golib with Go
    // (buildGoServerLibrary task below), not from AGP's C++/NDK build.
    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
        }
    }
}

dependencies {
    implementation(libs.core.ktx)
    implementation(libs.activity.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
}

tasks.register<Exec>("buildGoServerLibrary") {
    description = "Cross-compiles the Go server into JNI shared libraries for each ABI."
    workingDir = rootProject.projectDir
    commandLine("bash", "scripts/build-go-lib.sh")
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn("buildGoServerLibrary")
}
