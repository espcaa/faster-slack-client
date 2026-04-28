//go:build darwin

package utils

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Foundation

#import <Foundation/Foundation.h>

void notifyDownloadFinished(const char* path) {
    NSString* p = [NSString stringWithUTF8String:path];
    [[NSDistributedNotificationCenter defaultCenter]
        postNotificationName:@"com.apple.DownloadFileFinished"
                      object:p];
}
*/
import "C"
import "unsafe"

// tells the dock that a file was downloaded yay
func NotifyDownloadFinished(path string) {
	cpath := C.CString(path)
	defer C.free(unsafe.Pointer(cpath))
	C.notifyDownloadFinished(cpath)
}
