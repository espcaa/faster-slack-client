//go:build darwin

package utils

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework WebKit

#import <WebKit/WebKit.h>

@interface WebviewWindow : NSWindow
@property (nonatomic, strong) WKWebView *webView;
@end

@interface WailsNavDelegate : NSObject <WKNavigationDelegate, WKUIDelegate>
@property (nonatomic, copy) void (^onSlackURL)(NSString*);
@property (nonatomic, assign) id<WKNavigationDelegate> originalNavDelegate;
@property (nonatomic, assign) id<WKUIDelegate> originalUIDelegate;
@end

@implementation WailsNavDelegate
- (void)webView:(WKWebView*)webView
    decidePolicyForNavigationAction:(WKNavigationAction*)action
    decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSString* url = action.request.URL.absoluteString;
    if ([url hasPrefix:@"slack://"]) {
        self.onSlackURL(url);
        decisionHandler(WKNavigationActionPolicyCancel);
    } else {
        if ([self.originalNavDelegate respondsToSelector:@selector(webView:decidePolicyForNavigationAction:decisionHandler:)]) {
            [self.originalNavDelegate webView:webView decidePolicyForNavigationAction:action decisionHandler:decisionHandler];
        } else {
            decisionHandler(WKNavigationActionPolicyAllow);
        }
    }
}

- (void)webView:(WKWebView*)webView didCommitNavigation:(WKNavigation*)navigation {
    if ([self.originalNavDelegate respondsToSelector:@selector(webView:didCommitNavigation:)]) {
        [self.originalNavDelegate webView:webView didCommitNavigation:navigation];
    }
}

- (void)webView:(WKWebView*)webView didFinishNavigation:(WKNavigation*)navigation {
    if ([self.originalNavDelegate respondsToSelector:@selector(webView:didFinishNavigation:)]) {
        [self.originalNavDelegate webView:webView didFinishNavigation:navigation];
    }
}

- (WKWebView*)webView:(WKWebView*)webView
    createWebViewWithConfiguration:(WKWebViewConfiguration*)configuration
    forNavigationAction:(WKNavigationAction*)navigationAction
    windowFeatures:(WKWindowFeatures*)windowFeatures {
    [webView loadRequest:navigationAction.request];
    return nil;
}
@end

static NSMutableArray* delegateRefs;

void setUserAgent(void* windowPtr, const char* ua) {
    WebviewWindow* win = (__bridge WebviewWindow*)windowPtr;
    WKWebView* wv = win.webView;
    if (wv == nil) return;
    NSString* uaStr = [NSString stringWithUTF8String:ua];
    dispatch_async(dispatch_get_main_queue(), ^{
        [wv setCustomUserAgent:uaStr];
    });
}

void addUserScript(void* windowPtr, const char* js) {
    WebviewWindow* win = (__bridge WebviewWindow*)windowPtr;
    WKWebView* wv = win.webView;
    if (wv == nil) return;
    NSString* source = [NSString stringWithUTF8String:js];
    dispatch_async(dispatch_get_main_queue(), ^{
        WKUserScript* script = [[WKUserScript alloc]
            initWithSource:source
            injectionTime:WKUserScriptInjectionTimeAtDocumentEnd
            forMainFrameOnly:YES];
        [wv.configuration.userContentController addUserScript:script];
    });
}

extern void cookiesCallback(const char*);

void getAllCookies(void* windowPtr) {
    WebviewWindow* win = (__bridge WebviewWindow*)windowPtr;
    WKWebView* wv = win.webView;
    if (wv == nil) {
        cookiesCallback("[]");
        return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        [wv.configuration.websiteDataStore.httpCookieStore getAllCookies:^(NSArray<NSHTTPCookie*>* cookies) {
            NSMutableArray* arr = [NSMutableArray new];
            for (NSHTTPCookie* c in cookies) {
                [arr addObject:@{@"name": c.name, @"value": c.value, @"domain": c.domain, @"path": c.path}];
            }
            NSData* data = [NSJSONSerialization dataWithJSONObject:arr options:0 error:nil];
            NSString* result = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            cookiesCallback([result UTF8String]);
        }];
    });
}

extern void slackURLCallback(const char*);

void setNavDelegate(void* windowPtr, void (*callback)(const char*)) {
    if (!delegateRefs) delegateRefs = [NSMutableArray new];
    WebviewWindow* win = (__bridge WebviewWindow*)windowPtr;
    WKWebView* wv = win.webView;
    if (wv == nil) return;
    WailsNavDelegate* delegate = [WailsNavDelegate new];
    delegate.onSlackURL = ^(NSString* url) {
        callback([url UTF8String]);
    };
    delegate.originalNavDelegate = wv.navigationDelegate;
    delegate.originalUIDelegate = wv.UIDelegate;
    [delegateRefs addObject:delegate];
    dispatch_async(dispatch_get_main_queue(), ^{
        wv.navigationDelegate = delegate;
        wv.UIDelegate = delegate;
        // Enable default website data store for persistent caching
        WKWebsiteDataStore* dataStore = [WKWebsiteDataStore defaultDataStore];
        wv.configuration.websiteDataStore = dataStore;
    });
}

void removeNavDelegate(void* windowPtr) {
    if (!delegateRefs) return;
    WebviewWindow* win = (__bridge WebviewWindow*)windowPtr;
    WKWebView* wv = win.webView;
    if (wv == nil) return;
    dispatch_async(dispatch_get_main_queue(), ^{
        id currentDelegate = wv.navigationDelegate;
        if (currentDelegate) {
            [delegateRefs removeObject:currentDelegate];
        }
        wv.navigationDelegate = nil;
        wv.UIDelegate = nil;
    });
}
*/
import "C"
import (
	"fastslack/shared"
	"unsafe"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var slackURLHandler func(string)
var cookiesHandler func([]shared.Cookie, error)

func SetWebviewUserAgent(window application.Window, ua string) {
	ptr := window.NativeWindow()
	if ptr == nil {
		return
	}
	cua := C.CString(ua)
	defer C.free(unsafe.Pointer(cua))
	C.setUserAgent(ptr, cua)
}

func AddUserScript(window application.Window, js string) {
	ptr := window.NativeWindow()
	if ptr == nil {
		return
	}
	cjs := C.CString(js)
	defer C.free(unsafe.Pointer(cjs))
	C.addUserScript(ptr, cjs)
}

func InterceptSlackURL(window application.Window, handler func(string)) {
	slackURLHandler = handler
	ptr := window.NativeWindow()
	if ptr == nil {
		return
	}
	C.setNavDelegate(ptr, (*[0]byte)(C.slackURLCallback))
}

func CleanupNavDelegate(window application.Window) {
	ptr := window.NativeWindow()
	if ptr == nil {
		return
	}
	C.removeNavDelegate(ptr)
}

func GetAllCookies(window application.Window, callback func([]shared.Cookie, error)) {
	ptr := window.NativeWindow()
	if ptr == nil {
		callback(nil, nil)
		return
	}
	cookiesHandler = callback
	C.getAllCookies(ptr)
}
