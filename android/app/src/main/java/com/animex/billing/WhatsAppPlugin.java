package com.animex.billing;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URLEncoder;

@CapacitorPlugin(name = "WhatsAppOpener")
public class WhatsAppPlugin extends Plugin {

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String phone = call.getString("phone", "");
        String text = call.getString("text", "");
        if (text == null) text = "";

        try {
            boolean launched = false;

            // 1. If customer phone is available, open direct chat
            if (phone != null && !phone.trim().isEmpty()) {
                String cleanDigits = phone.replaceAll("[^0-9]", "");
                if (cleanDigits.length() >= 10) {
                    if (cleanDigits.length() == 10) {
                        cleanDigits = "91" + cleanDigits;
                    }
                    String url = "https://api.whatsapp.com/send?phone=" + cleanDigits + "&text=" + URLEncoder.encode(text, "UTF-8");
                    Intent viewIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    if (isPackageInstalled("com.whatsapp")) {
                        viewIntent.setPackage("com.whatsapp");
                    } else if (isPackageInstalled("com.whatsapp.w4b")) {
                        viewIntent.setPackage("com.whatsapp.w4b");
                    }

                    try {
                        getContext().startActivity(viewIntent);
                        launched = true;
                    } catch (Exception e) {
                        launched = false;
                    }
                }
            }

            // 2. If no phone or direct chat intent failed, launch WhatsApp contact picker via ACTION_SEND
            if (!launched) {
                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType("text/plain");
                sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                sendIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                if (isPackageInstalled("com.whatsapp")) {
                    sendIntent.setPackage("com.whatsapp");
                } else if (isPackageInstalled("com.whatsapp.w4b")) {
                    sendIntent.setPackage("com.whatsapp.w4b");
                }

                try {
                    getContext().startActivity(sendIntent);
                    launched = true;
                } catch (Exception e) {
                    Intent chooser = Intent.createChooser(sendIntent, "WhatsApp");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(chooser);
                    launched = true;
                }
            }

            call.resolve();
        } catch (Exception ex) {
            call.reject(ex.getMessage());
        }
    }

    private boolean isPackageInstalled(String packageName) {
        try {
            getContext().getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
