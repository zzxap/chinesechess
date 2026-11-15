package com.zzxap.chinesechess

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

class ChessAIModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val worker = Executors.newSingleThreadExecutor()
  override fun getName() = "ChessAI"
  private external fun analyzeNative(fen: String, modelPath: String): String

  private fun modelFile(): File {
    val hash = "7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e"
    val target = File(reactApplicationContext.filesDir, "ai-$hash.nnue")
    if (!target.isFile) {
      val temp = File.createTempFile("ai-model", ".tmp", reactApplicationContext.filesDir)
      try {
        val digest = MessageDigest.getInstance("SHA-256")
        reactApplicationContext.assets.open("model.nnue").use { input ->
          temp.outputStream().use { output ->
            val buffer = ByteArray(65536)
            while (true) {
              val count = input.read(buffer)
              if (count < 0) break
              digest.update(buffer, 0, count)
              output.write(buffer, 0, count)
            }
          }
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
        check(actual == hash) { "Bundled AI model checksum mismatch" }
        check(temp.renameTo(target)) { "Cannot install bundled AI model" }
      } finally { temp.delete() }
    }
    return target
  }

  @ReactMethod
  fun analyze(fen: String, promise: Promise) {
    try {
      worker.execute {
        try {
          require(fen.isNotBlank() && fen.length <= 1024) { "Invalid FEN" }
          promise.resolve(analyzeNative(fen, modelFile().absolutePath))
        } catch (error: Exception) { promise.reject("AI_ANALYSIS", error.message, error) }
      }
    } catch (error: RejectedExecutionException) { promise.reject("AI_CLOSED", error.message, error) }
  }

  override fun invalidate() {
    worker.shutdown()
    super.invalidate()
  }

  companion object { init { System.loadLibrary("chessai_jni") } }
}
