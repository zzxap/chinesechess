// SPDX-License-Identifier: GPL-3.0-or-later
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#include "../bridge/session.hpp"

@interface ChessAI : NSObject <RCTBridgeModule>
@end
@implementation ChessAI
RCT_EXPORT_MODULE(ChessAI)
+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue {
  static dispatch_queue_t queue;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ queue = dispatch_queue_create("com.zzxap.chinesechess.ai", DISPATCH_QUEUE_SERIAL); });
  return queue;
}
RCT_EXPORT_METHOD(analyze:(NSString *)fen
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    NSBundle *resources = [NSBundle bundleWithURL:[[NSBundle mainBundle] URLForResource:@"ChessAIResources" withExtension:@"bundle"]];
    NSString *path = [resources pathForResource:@"model" ofType:@"nnue"];
    if (!path) { reject(@"AI_MODEL", @"Bundled AI model is missing", nil); return; }
    if (!fen || ![fen length] || [fen length] > 1024) { reject(@"AI_FEN", @"Invalid FEN", nil); return; }
    try {
      auto result = chessai::session().analyze([fen UTF8String], [path UTF8String]);
      resolve([NSString stringWithUTF8String:result.c_str()]);
    } catch (const std::exception& error) {
      reject(@"AI_ANALYSIS", [NSString stringWithUTF8String:error.what()], nil);
    }
  } @catch (NSException *exception) {
    reject(@"AI_ANALYSIS", exception.reason, nil);
  }
}
@end
