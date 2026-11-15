require 'cocoapods'

root = Pathname.new(__dir__).join('../..').expand_path
pod_root = root.join('native/ai-engine')
spec = Pod::Specification.from_file(pod_root.join('ChineseChessAI.podspec'))
[:ios, :osx].each do |platform|
  accessor = Pod::Sandbox::FileAccessor.new(pod_root, spec.consumer(platform))
  expected = pod_root.join('vendor/AIEngine.xcframework')
  abort "#{platform}: CocoaPods did not discover AIEngine.xcframework" unless accessor.vendored_xcframeworks.include?(expected)
  resources = accessor.resource_bundles.fetch('ChessAIResources', [])
  abort "#{platform}: CocoaPods did not discover model.nnue" unless resources.include?(pod_root.join('vendor/model.nnue'))
  abort "#{platform}: CocoaPods did not discover license notices" unless resources.any? { |path| path.extname == '.txt' }
  puts "#{platform}: CocoaPods recognized AI library, model and license notices"
end
