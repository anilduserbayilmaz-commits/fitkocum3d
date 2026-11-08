package com.fitkocum.app;

import android.app.Activity;
import android.webkit.WebView;
import com.huawei.wearengine.HiWear;
import com.huawei.wearengine.auth.AuthCallback;
import com.huawei.wearengine.auth.Permission;
import com.huawei.wearengine.device.Device;
import com.huawei.wearengine.p2p.Message;
import com.huawei.wearengine.p2p.P2pClient;
import com.huawei.wearengine.p2p.Peer;
import com.huawei.wearengine.p2p.Receiver;
import com.huawei.wearengine.p2p.SendCallback;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.json.JSONObject;

final class WatchSync {
    private final Activity activity;
    private final WebView webView;
    private P2pClient client;
    private Receiver receiver;
    private boolean connecting;
    private boolean closed;

    WatchSync(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    void connect() {
        if (closed || connecting || receiver != null) return;
        connecting = true;
        status("Huawei Sağlık bağlantısı kontrol ediliyor…");
        var auth = HiWear.getAuthClient(activity);
        auth.checkPermission(Permission.DEVICE_MANAGER)
            .addOnSuccessListener(granted -> {
                if (closed) return;
                if (Boolean.TRUE.equals(granted)) findWatch();
                else auth.requestPermission(new AuthCallback() {
                    @Override public void onOk(Permission[] permissions) {
                        activity.runOnUiThread(() -> {
                            if (!closed) findWatch();
                        });
                    }
                    @Override public void onCancel() {
                        activity.runOnUiThread(() -> fail("Saat bağlantısı izni verilmedi."));
                    }
                }, Permission.DEVICE_MANAGER)
                    .addOnFailureListener(this::serviceError);
            })
            .addOnFailureListener(this::serviceError);
    }

    private void findWatch() {
        HiWear.getDeviceClient(activity).getBondedDevices()
            .addOnSuccessListener(devices -> {
                if (closed) return;
                Device selected = null;
                for (Device device : devices) {
                    String name = device.getName();
                    if (!device.isConnected() || name == null ||
                            !name.toUpperCase(Locale.ROOT).contains("FIT 5 PRO")) continue;
                    if (selected != null) {
                        fail("Birden fazla Watch Fit 5 Pro bağlı.");
                        return;
                    }
                    selected = device;
                }
                if (selected == null) fail("Huawei Sağlık’ta bağlı Watch Fit 5 Pro bulunamadı.");
                else register(selected);
            })
            .addOnFailureListener(this::serviceError);
    }

    private void register(Device device) {
        client = HiWear.getP2pClient(activity);
        Peer peer = new Peer.Builder().setDevice(device).setPkgName("com.fitkocum.watchlite")
            .setFingerPrint("com.fitkocum.watchlite_BNS+YysbLwxy1h0BtvMg13QZ0n2v94iLelGtPb/i+LYSLlWTttJOpKi/PUci7clRQqQ4bMTncFp9PtMiv6MvpBo=").build();
        Receiver incoming = message -> activity.runOnUiThread(() -> receive(peer, message));
        client.registerReceiver(peer, incoming).addOnSuccessListener(unused -> {
            if (closed) {
                client.unregisterReceiver(incoming);
                return;
            }
            receiver = incoming;
            connecting = false;
            status("Hazır. Saatte FitKoçum’u aç.");
        }).addOnFailureListener(this::serviceError);
    }

    private void receive(Peer peer, Message message) {
        if (closed || message.getType() != Message.MESSAGE_TYPE_DATA) return;
        byte[] data = message.getData();
        String raw = data == null ? message.getDescription() : new String(data, StandardCharsets.UTF_8);
        if (raw == null || raw.length() > 1024) return;
        try {
            String messageId = new JSONObject(raw).getString("messageId");
            webView.evaluateJavascript("window.fitReceiveWatchSet?.(" + JSONObject.quote(raw) + ")", result -> {
                if (!closed && "true".equals(result)) acknowledge(peer, messageId);
            });
        } catch (org.json.JSONException ignored) {
            // Ignore malformed packets from the peer.
        }
    }

    private void acknowledge(Peer peer, String id) {
        String ack = "{\"v\":1,\"type\":\"ack\",\"messageId\":" + JSONObject.quote("ack-" + id)
            + ",\"payload\":{\"messageId\":" + JSONObject.quote(id) + "}}";
        Message message = new Message.Builder().setPayload(ack.getBytes(StandardCharsets.UTF_8)).build();
        client.send(peer, message, new SendCallback() {
            @Override public void onSendResult(int result) {}
            @Override public void onSendProgress(long progress) {}
        });
    }

    private void serviceError(Exception error) {
        android.util.Log.w("FitKocumWatch", "Wear Engine request failed", error);
        fail("Saat bağlantısı kurulamadı. Huawei Sağlık bağlantısını ve Wear Engine iznini kontrol et.");
    }

    private void fail(String message) {
        connecting = false;
        status(message);
    }

    private void status(String message) {
        if (!closed) webView.evaluateJavascript(
            "window.fitWatchStatus?.(" + JSONObject.quote(message) + ")", null);
    }

    void close() {
        closed = true;
        if (receiver != null) client.unregisterReceiver(receiver);
    }
}
