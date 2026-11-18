package app.kira;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.net.Uri;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import androidx.core.content.res.ResourcesCompat;
import org.json.JSONObject;

/** Reads the summary the web app stores through @capacitor/preferences; never talks to Firestore. */
public class KiraWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        manager.updateAppWidget(ids, build(context));
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, KiraWidget.class));
        if (ids.length > 0) manager.updateAppWidget(ids, build(context));
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kira);
        int flags = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent openApp = PendingIntent.getActivity(context, 0, open, flags);
        for (int id : new int[] {android.R.id.background, R.id.widget_hero, R.id.widget_in_tile, R.id.widget_out_tile}) {
            views.setOnClickPendingIntent(id, openApp);
        }
        Intent add = new Intent(Intent.ACTION_VIEW, Uri.parse("kira://add")).setPackage(context.getPackageName());
        views.setOnClickPendingIntent(R.id.widget_add, PendingIntent.getActivity(context, 1, add, flags));

        // Capacitor Preferences keeps its values in the "CapacitorStorage" SharedPreferences.
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("widget", null);
        String thisMonth = new SimpleDateFormat("yyyy-MM", Locale.US).format(new Date());
        try {
            JSONObject s = new JSONObject(raw);
            if (!thisMonth.equals(s.getString("ym"))) throw new IllegalStateException("stale");
            views.setTextViewText(R.id.widget_label, s.getString("label"));
            setNumber(context, views, R.id.widget_left, rm(s.getLong("left")), 32, 190, 44, 0xFFFFFFFF);
            setNumber(context, views, R.id.widget_in, rm(s.getLong("income")), 16, 110, 22, 0xFFF2F2F2);
            setNumber(context, views, R.id.widget_out, rm(s.getLong("expense")), 16, 110, 22, 0xFFF2F2F2);
            views.setViewVisibility(R.id.widget_totals, View.VISIBLE);
        } catch (Exception e) {
            // Never opened yet, or the stored month is over: don't show last month's numbers.
            views.setTextViewText(R.id.widget_label, "kira");
            setNumber(context, views, R.id.widget_left, "Open kira to update", 32, 190, 44, 0xFFFFFFFF);
            views.setViewVisibility(R.id.widget_totals, View.GONE);
        }
        return views;
    }

    /**
     * The launcher draws widgets in its own process and can't load our font resources, so numbers are drawn
     * into a bitmap here with Bricolage and shown as an image. Text shrinks to fit the box; the ImageView
     * scales the box to the tile.
     */
    private static void setNumber(Context context, RemoteViews views, int viewId, String text, float sp, float widthDp, float heightDp, int color) {
        android.util.DisplayMetrics dm = context.getResources().getDisplayMetrics();
        int w = Math.round(widthDp * dm.density);
        int h = Math.round(heightDp * dm.density);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setTypeface(ResourcesCompat.getFont(context, R.font.bricolage_extrabold));
        paint.setColor(color);
        paint.setTextSize(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, dm));
        float width = paint.measureText(text);
        if (width > w) paint.setTextSize(paint.getTextSize() * w / width);
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        new Canvas(bitmap).drawText(text, 0, h / 2f - (paint.ascent() + paint.descent()) / 2f, paint);
        views.setImageViewBitmap(viewId, bitmap);
        views.setContentDescription(viewId, text);
    }

    /** Integer sen -> "RM 1,234.50" (same shape as formatRM in src/lib/money.ts). */
    private static String rm(long sen) {
        long abs = Math.abs(sen);
        return String.format(Locale.US, "%sRM %,d.%02d", sen < 0 ? "\u2212" : "", abs / 100, abs % 100);
    }
}
