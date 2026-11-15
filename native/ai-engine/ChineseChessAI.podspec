unless File.file?(File.join(__dir__, 'vendor/AIEngine.xcframework/Info.plist')) &&
       File.file?(File.join(__dir__, 'vendor/model.nnue'))
  raise 'Apple AI artifacts are missing. Run bash scripts/build-ai-engine-libs.sh apple before pod install; after downloading artifacts, run python3 scripts/ci/prepare-apple-ai.py.'
end

Pod::Spec.new do |s|
  s.name = 'ChineseChessAI'
  s.version = '1.0.0'
  s.summary = 'In-process Chinese chess analysis for the app'
  s.homepage = 'https://github.com/zzxap/chinesechess'
  s.license = { :type => 'GPL-3.0-or-later', :file => 'vendor/LICENSE' }
  s.author = 'zzxap'
  s.source = { :git => 'https://github.com/zzxap/chinesechess.git' }
  s.platforms = { :ios => '15.1', :osx => '14.0' }
  s.source_files = 'apple/ChessAI.mm', 'bridge/session.hpp', 'include/ai_engine.h'
  s.private_header_files = 'bridge/session.hpp', 'include/ai_engine.h'
  s.vendored_frameworks = 'vendor/AIEngine.xcframework'
  s.resource_bundles = { 'ChessAIResources' => ['vendor/model.nnue', 'vendor/licenses/*.txt'] }
  s.libraries = 'c++'
  s.pod_target_xcconfig = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17' }
  s.dependency 'React-Core'
end
