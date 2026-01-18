
import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GRID_POINT_URL = 'https://api.weather.gov/gridpoints/LOX/152,48/forecast/hourly';
const ALERTS_URL = 'https://api.weather.gov/alerts/active?zone=CAZ368';
const USER_AGENT = '(hills-ledger-app, contact@example.com)';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sim = searchParams.get('sim');

        // 1. Fetch Weather Data
        const weatherRes = await fetch(GRID_POINT_URL, {
            headers: { 'User-Agent': USER_AGENT },
            next: { revalidate: 300 }
        });

        let weatherData = null;
        let computedAlerts: any[] = [];
        let alertsToDelete: string[] = [];

        const now = new Date();

        if (weatherRes.ok) {
            const json = await weatherRes.json();
            const periods = json.properties?.periods || [];

            // Find the period that covers the current time
            const current = periods.find((p: any) => {
                const start = new Date(p.startTime);
                const end = new Date(p.endTime);
                return now >= start && now < end;
            }) || periods[0];

            if (current) {
                const windMph = parseInt(current.windSpeed?.split(' ')[0] || "0");
                const humidity = current.relativeHumidity?.value || 0;

                weatherData = {
                    temp: current.temperature,
                    condition: current.shortForecast,
                    windSpeed: current.windSpeed,
                    humidity: humidity,
                    icon: current.icon
                };

                // Logic Gates
                const redFlagId = 'system-logic-red-flag-warning';
                if (sim === 'red_flag' || (humidity > 0 && humidity <= 15 && windMph >= 25)) {
                    computedAlerts.push({
                        event: 'Red Flag Warning',
                        severity: 'Severe',
                        headline: 'CRITICAL RED FLAG WARNING',
                        description: `EXTREME FIRE DANGER DETECTED. Humidity is ${humidity}% and Wind is ${windMph} mph. LAFD Parking Restrictions in effect.`,
                        type: 'FIRE_WEATHER',
                        level: 'CRITICAL',
                        impact: 5,
                        source_url: redFlagId,
                        confidence: 'Automated Logic Gate'
                    });
                } else {
                    alertsToDelete.push(redFlagId);
                }

                // Wind Advisory
                const windAdvisoryId = 'system-logic-wind-advisory';
                if (sim === 'wind_advisory' || windMph >= 46) {
                    computedAlerts.push({
                        event: 'Wind Advisory',
                        severity: 'Moderate',
                        headline: 'WIND ADVISORY',
                        description: `High winds detected. Sustained winds or gusts exceeding 46 mph. Secure loose items.`,
                        type: 'WEATHER',
                        level: 'ADVISORY',
                        impact: 3,
                        source_url: windAdvisoryId,
                        confidence: 'Automated Logic Gate'
                    });
                } else {
                    alertsToDelete.push(windAdvisoryId);
                }
            }
        } else {
            console.error('NWS Weather Fetch Failed', weatherRes.statusText);
        }

        // 2. Fetch Alerts
        const alertsRes = await fetch(ALERTS_URL, {
            headers: { 'User-Agent': USER_AGENT },
            next: { revalidate: 300 }
        });

        let activeAlerts: any[] = [];
        if (alertsRes.ok) {
            const json = await alertsRes.json();
            activeAlerts = json.features || [];
        }

        // 3. Process & Sync with DB
        const area = await supabaseServer
            .from('areas')
            .select('id')
            .eq('slug', 'hollywood-hills')
            .single();

        if (area.data) {

            // A. Clean up inactive system alerts
            if (alertsToDelete.length > 0) {
                await supabaseServer
                    .from('events')
                    .delete()
                    .in('source_url', alertsToDelete);
            }

            // B. Upsert Computed Alerts
            for (const alert of computedAlerts) {
                const { data: existing } = await supabaseServer
                    .from('events')
                    .select('id')
                    .eq('source_url', alert.source_url)
                    .maybeSingle();

                if (!existing) {
                    await supabaseServer.from('events').insert({
                        area_id: area.data.id,
                        source_id: null,
                        event_type: alert.type,
                        level: alert.level,
                        verification: 'VERIFIED',
                        impact: alert.impact,
                        title: alert.headline,
                        summary: alert.description,
                        location_label: 'System Logic (NWS Data)',
                        observed_at: new Date().toISOString(),
                        source_url: alert.source_url,
                        confidence_basis: alert.confidence,
                    });
                } else {
                    // Update valid alerts with latest verification time/data
                    await supabaseServer.from('events').update({
                        observed_at: new Date().toISOString(),
                        summary: alert.description
                    }).eq('source_url', alert.source_url);
                }
            }

            // C. Upsert Real NWS Alerts
            for (const feature of activeAlerts) {
                const props = feature.properties;
                // Filter for relevant
                if (props.event === 'Wind Advisory' || props.event === 'Red Flag Warning' || props.severity === 'Severe') {
                    const { data: existing } = await supabaseServer
                        .from('events')
                        .select('id')
                        .eq('source_url', props.id)
                        .maybeSingle();

                    if (!existing) {
                        await supabaseServer.from('events').insert({
                            area_id: area.data.id,
                            source_id: null,
                            event_type: props.event.includes('Fire') ? 'FIRE_WEATHER' : 'WEATHER',
                            level: props.severity === 'Severe' || props.event === 'Red Flag Warning' ? 'CRITICAL' : 'ADVISORY',
                            verification: 'VERIFIED',
                            impact: props.event === 'Red Flag Warning' ? 5 : 3,
                            title: props.event,
                            summary: props.headline || props.description?.substring(0, 200),
                            location_label: 'NWS Los Angeles',
                            observed_at: new Date().toISOString(),
                            source_url: props.id,
                            confidence_basis: 'National Weather Service API',
                        });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            weather: weatherData,
            computedAlerts: computedAlerts.length,
            deletedAlerts: alertsToDelete.length,
            nwsAlerts: activeAlerts.length
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
