Pod::Spec.new do |s|
  s.name = 'chess_ai_ffi'
  s.version = '0.1.0'
  s.summary = 'Local AI C ABI for Dart FFI'
  s.description = s.summary
  s.homepage = 'https://github.com/zzxap/chinesechess'
  s.license = { :type => 'GPL-3.0-or-later', :file => 'vendor/LICENSE' }
  s.author = 'zzxap'
  s.source = { :path => '.' }
  s.source_files = 'Classes/*.{c,h}'
  s.vendored_frameworks = 'vendor/AIEngine.xcframework'
  s.libraries = 'c++'
  # Retain the C API both when this Pod is built as a dynamic framework and
  # when the app consumes static Pod libraries.
  s.pod_target_xcconfig = {
    'OTHER_LDFLAGS' => '$(inherited) -Wl,-u,_pf_create -Wl,-u,_pf_analyze -Wl,-u,_pf_stop -Wl,-u,_pf_destroy'
  }
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '$(inherited) -Wl,-u,_pf_create -Wl,-u,_pf_analyze -Wl,-u,_pf_stop -Wl,-u,_pf_destroy -Wl,-export_dynamic'
  }
  s.platform = :ios, '15.1'
  s.dependency 'Flutter'
end
