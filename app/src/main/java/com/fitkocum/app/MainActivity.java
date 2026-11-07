package com.fitkocum.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Parcelable;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int PHOTO_PICKER_REQUEST = 4105;
    private final ExecutorService background = Executors.newSingleThreadExecutor();
    private WebView webView;
    private ValueCallback<Uri[]> filePicker;
    private Uri cameraUri;
    private File cameraFile;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(12, 17, 24));
        getWindow().setNavigationBarColor(Color.rgb(12, 17, 24));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(12, 17, 24));
        webView.getSettings().setJavaScriptEnabled(true);
        // Allow locally bundled muted exercise MP4s to autoplay in WebView.
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        webView.getSettings().setAllowFileAccessFromFileURLs(false);
        webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("file".equals(uri.getScheme()) && uri.toString().startsWith("file:///android_asset/")) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                         ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePicker != null) filePicker.onReceiveValue(null);
                filePicker = callback;
                cameraUri = null;cameraFile = null;
                try {
                    Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
                    gallery.addCategory(Intent.CATEGORY_OPENABLE);
                    gallery.setType("image/*");

                    Intent capture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    cameraFile = new File(getCacheDir(), "fitkocum_meal_camera.jpg");
                    cameraUri = FileProvider.getUriForFile(
                        MainActivity.this, getPackageName() + ".fileprovider", cameraFile);
                    capture.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                    capture.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

                    Intent chooser = Intent.createChooser(gallery, "Yemek fotoğrafı seç");
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Parcelable[]{capture});
                    startActivityForResult(chooser, PHOTO_PICKER_REQUEST);
                    return true;
                } catch (Exception e) {
                    if (filePicker != null) {filePicker.onReceiveValue(null);filePicker = null;}
                    return false;
                }
            }
        });
        webView.addJavascriptInterface(new AppBridge(), "FitAndroid");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PHOTO_PICKER_REQUEST || filePicker == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null) result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            if ((result == null || result.length == 0) && cameraFile != null &&
                cameraFile.exists() && cameraFile.length() > 0 && cameraUri != null) {
                result = new Uri[]{cameraUri};
            }
        }
        filePicker.onReceiveValue(result);
        filePicker = null;
        cameraUri = null;
        cameraFile = null;
    }

    private final class AppBridge {
        @JavascriptInterface public String loadModelBase64(String modelId) {
            if (modelId == null || !modelId.matches("[a-z0-9_]{2,50}")) return "";
            try (InputStream input = getAssets().open("models/" + modelId + ".glb");
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] chunk = new byte[32768];
                int read;
                while ((read = input.read(chunk)) != -1) {
                    output.write(chunk, 0, read);
                    if (output.size() > 14_000_000) return "";
                }
                return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
            } catch (Exception error) {
                android.util.Log.e("FitKocum", "3D model couldn't be loaded", error);
                return "";
            }
        }
        @JavascriptInterface public void shareData(String json) {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, json);
                startActivity(Intent.createChooser(intent, "FitKoçum kayıtlarını paylaş"));
            });
        }

        @JavascriptInterface public void analyzeMeal(String imageDataUrl, String apiKey, String notes) {
            if (imageDataUrl == null || !imageDataUrl.startsWith("data:image/jpeg;base64,")
                    || imageDataUrl.length() > 8_000_000) {
                errorToPage("Geçerli bir JPEG fotoğrafı seç.");return;
            }
            if (apiKey == null || apiKey.trim().length() < 15 || apiKey.length() > 250) {
                errorToPage("Google AI Studio API anahtarı geçerli görünmüyor.");return;
            }
            final String base64 = imageDataUrl.substring(imageDataUrl.indexOf(',') + 1);
            final String key = apiKey.trim();
            final String portion = notes == null ? "" : notes.substring(0,Math.min(notes.length(),140));
            background.execute(() -> estimateWithGemini(base64,key,portion));
        }
    }

    private void estimateWithGemini(String base64, String key, String notes) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(18000);
            connection.setReadTimeout(50000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type","application/json; charset=utf-8");
            connection.setRequestProperty("x-goog-api-key",key);

            String prompt =
                "Bu fotoğraftaki yemeklerin yaklaşık enerji içeriğini Türkçe değerlendir. " +
                "Yalnız fotoğraftan gram ve kalori kesin anlaşılamaz. Makul ve temkinli toplam kalori aralığı ver. " +
                "Görünen her yiyeceği ve porsiyonu ayır; yağ, sos ve görünmeyen malzeme belirsizliğini belirt. " +
                "Porsiyon notu: " + notes + ". " +
                "Yemeği yemeli/yememeli diye karar verme, diyet ya da öğün atlama tavsiyesi verme. " +
                "Yalnız şu alanlara sahip geçerli JSON döndür: " +
                "{\"meal_name\":\"kısa Türkçe ad\",\"items\":[{\"name\":\"yiyecek\",\"estimate\":\"görünür porsiyon ve yaklaşık kcal\"}]," +
                "\"kcal_min\":250,\"kcal_max\":500,\"uncertainty\":\"tahmini değiştirebilecek belirsizlik\"}. " +
                "Fotoğrafta yemek yoksa kcal_min ve kcal_max alanlarını 0 yap.";

            JSONObject inline = new JSONObject().put("mime_type","image/jpeg").put("data",base64);
            JSONObject body = new JSONObject()
                .put("contents",new JSONArray().put(new JSONObject()
                    .put("parts",new JSONArray()
                        .put(new JSONObject().put("text",prompt))
                        .put(new JSONObject().put("inline_data",inline)))))
                .put("generationConfig",new JSONObject()
                    .put("responseMimeType","application/json").put("temperature",0.2));
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream out=connection.getOutputStream()) {out.write(bytes);}
            int code=connection.getResponseCode();
            InputStream stream=code>=200&&code<300 ? connection.getInputStream() : connection.getErrorStream();
            String result=readFully(stream);
            if (code<200||code>=300) {
                String message="Google API HTTP "+code;
                try {message+=": "+new JSONObject(result).getJSONObject("error").optString("message","");}catch(Exception ignored){}
                errorToPage(message);return;
            }
            JSONObject root = new JSONObject(result);
            String text=root.getJSONArray("candidates").getJSONObject(0)
                .getJSONObject("content").getJSONArray("parts").getJSONObject(0).getString("text");
            String js="window.onFoodResult("+JSONObject.quote(text)+");";
            runOnUiThread(() -> {if(webView!=null)webView.evaluateJavascript(js,null);});
        } catch (Exception ex) {
            errorToPage("Bağlantı ya da analiz hatası. API anahtarını ve interneti kontrol et. "+ex.getClass().getSimpleName());
        } finally {
            if(connection!=null)connection.disconnect();
        }
    }

    private static String readFully(InputStream input) throws Exception {
        if(input==null)return "";
        StringBuilder out = new StringBuilder();
        try(BufferedReader reader=new BufferedReader(new InputStreamReader(input,StandardCharsets.UTF_8))){
            String line;
            while((line=reader.readLine())!=null){
                out.append(line);
                if(out.length()>2_000_000)throw new IllegalStateException("Yanıt çok büyük");
            }
        }
        return out.toString();
    }
    private void errorToPage(String message){
        String js="window.onFoodError("+JSONObject.quote(message)+");";
        runOnUiThread(() -> {if(webView!=null)webView.evaluateJavascript(js,null);});
    }
    @Override public void onBackPressed() {
        if (webView == null) {super.onBackPressed();return;}
        webView.evaluateJavascript("(function(){var o=document.getElementById('overlay');if(o&&!o.hidden){document.getElementById('close').click();return true;}return false;})()", value->{
            if("false".equals(value)) finish();
        });
    }
    @Override protected void onDestroy() {
        background.shutdownNow();
        if (webView!=null){webView.destroy();webView=null;}
        super.onDestroy();
    }
}