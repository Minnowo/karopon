plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

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

    buildTypes {
        release {
            isMinifyEnabled = false
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
