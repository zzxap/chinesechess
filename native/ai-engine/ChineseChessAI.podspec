Pod::Spec.new do |s|
  s.name = 'ChineseChessAI'
  s.version = '1.0.0'
  s.summary = 'In-process Chinese chess analysis for the app'
  s.homepage = 'https://github.com/zzxap/chinesechess'
  s.license = { :type => 'GPL-3.0-or-later', :file => '../../LICENSE' }
  s.author = 'zzxap'
  s.source = { :git => 'https://github.com/zzxap/chinesechess.git' }
  s.platforms = { :ios => '15.1', :osx => '14.0' }
  s.source_files = 'apple/ChessAI.mm', 'bridge/session.hpp', 'include/ai_engine.h'
  s.private_header_files = 'bridge/session.hpp', 'include/ai_engine.h'
  s.vendored_frameworks = '../../AI/lib-dist/AIEngine.xcframework'
  s.resource_bundles = { 'ChessAIResources' => ['../../AI/lib-dist/model.nnue', '../../licenses/*.txt'] }
  s.libraries = 'c++'
  s.pod_target_xcconfig = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17' }
  s.dependency 'React-Core'
end
