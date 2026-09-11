package org.covenantlibrary.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int OPEN_FILE = 4101;
    private static final int SAVE_TEXT = 4102;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingText;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.addJavascriptInterface(new NativeStorage(), "CovenantNativeStorage");
        webView.addJavascriptInterface(new NativeFiles(), "CovenantNativeFiles");
        webView.setWebViewClient(new LocalClient());
        webView.setWebChromeClient(new Chrome());
        webView.loadUrl(ORIGIN + "/app/index.html");
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_FILE) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        if (requestCode == SAVE_TEXT) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingText != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out != null) out.write(pendingText.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "Text exported", Toast.LENGTH_SHORT).show();
                } catch (IOException error) {
                    Toast.makeText(this, "Unable to export text", Toast.LENGTH_LONG).show();
                }
            }
            pendingText = null;
        }
    }

    public final class NativeStorage {
        private final SharedPreferences prefs = getSharedPreferences("covenant-library", MODE_PRIVATE);
        @JavascriptInterface public String getItem(String key) { return prefs.contains(key) ? prefs.getString(key, null) : null; }
        @JavascriptInterface public void setItem(String key, String value) { prefs.edit().putString(key, value).commit(); }
    }

    public final class NativeFiles {
        @JavascriptInterface public void saveText(String filename, String text) {
            final String safe = sanitizeFilename(filename);
            pendingText = text == null ? "" : text;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TITLE, safe);
                try { startActivityForResult(intent, SAVE_TEXT); }
                catch (ActivityNotFoundException error) { Toast.makeText(MainActivity.this, "No document provider is available", Toast.LENGTH_LONG).show(); pendingText = null; }
            });
        }
    }

    private final class Chrome extends WebChromeClient {
        @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"text/plain", "application/json"});
            try { startActivityForResult(intent, OPEN_FILE); return true; }
            catch (ActivityNotFoundException error) { fileCallback = null; return false; }
        }
    }

    private final class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"appassets.androidplatform.net".equalsIgnoreCase(uri.getHost())) return null;
            String assetPath = "www" + uri.getPath();
            if (assetPath.contains("..")) return response(404, "text/plain", "Not found");
            try {
                InputStream stream = getAssets().open(assetPath);
                return new WebResourceResponse(mime(assetPath), "utf-8", 200, "OK", securityHeaders(), stream);
            } catch (IOException error) { return response(404, "text/plain", "Not found"); }
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("appassets.androidplatform.net".equalsIgnoreCase(uri.getHost())) return false;
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!scheme.equals("https") && !scheme.equals("http")) return true;
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
            catch (ActivityNotFoundException ignored) { }
            return true;
        }
    }

    private java.util.Map<String,String> securityHeaders() {
        java.util.Map<String,String> h = new java.util.HashMap<>();
        h.put("Cache-Control", "no-store"); h.put("X-Content-Type-Options", "nosniff"); h.put("Referrer-Policy", "no-referrer");
        h.put("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
        return h;
    }

    private WebResourceResponse response(int status, String mime, String text) {
        return new WebResourceResponse(mime, "utf-8", status, status == 404 ? "Not Found" : "Error", securityHeaders(), new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
    }

    private String mime(String name) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(name);
        String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        if (type != null) return type;
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".json")) return "application/json";
        if (name.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }

    private String sanitizeFilename(String name) {
        String value = name == null ? "covenant-library-export.txt" : name.replaceAll("[\\\\/:*?\"<>|]", "-").trim();
        if (value.isEmpty()) value = "covenant-library-export.txt";
        if (!value.toLowerCase(Locale.ROOT).endsWith(".txt")) value += ".txt";
        return value;
    }
}
