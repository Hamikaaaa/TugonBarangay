<?php

namespace App\Http\Controllers;

use App\Models\BarangayDocumentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SummonsSettingsController extends Controller
{
    private const KEY = 'barangay_mediation_notice';

    private const DEFAULTS = [
        'barangay_name' => 'Tayud',
        'municipality' => 'Consolacion',
        'province' => 'Cebu',
        'office_heading' => 'OFFICE OF THE PUNONG BARANGAY · LUPONG TAGAPAMAYAPA',
        'notice_title' => 'Notice to Appear',
        'notice_subtitle' => 'Barangay Mediation',
        'opening_text' => 'The parties named above are requested to appear before the Punong Barangay / Lupon Chairperson of Barangay {{barangay_name}} for a mediation meeting concerning the reported dispute. Please attend at the date, time, and place stated below.',
        'closing_text' => 'This notice is issued for barangay mediation proceedings. Kindly bring any relevant documents or information that may help clarify the matter.',
        'signatory_title' => 'Punong Barangay / Lupon Chairperson',
        'default_venue' => 'Barangay Hall, Barangay Tayud, Consolacion, Cebu',
    ];

    public function show()
    {
        $record = BarangayDocumentSetting::firstOrCreate(
            ['key' => self::KEY],
            ['settings' => self::DEFAULTS],
        );

        return response()->json(['data' => $this->serialize($record)]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'barangay_name' => ['required', 'string', 'max:255'],
            'municipality' => ['required', 'string', 'max:255'],
            'province' => ['required', 'string', 'max:255'],
            'office_heading' => ['required', 'string', 'max:255'],
            'notice_title' => ['required', 'string', 'max:100'],
            'notice_subtitle' => ['required', 'string', 'max:255'],
            'opening_text' => ['required', 'string', 'max:2000'],
            'closing_text' => ['required', 'string', 'max:1000'],
            'signatory_title' => ['required', 'string', 'max:255'],
            'default_venue' => ['required', 'string', 'max:500'],
        ]);

        $record = BarangayDocumentSetting::updateOrCreate(
            ['key' => self::KEY],
            ['settings' => $validated],
        );

        return response()->json([
            'message' => 'Barangay notice settings saved.',
            'data' => $this->serialize($record),
        ]);
    }

    public function uploadTemplate(Request $request)
    {
        $validated = $request->validate([
            'template_file' => ['sometimes', 'file', 'mimes:jpg,jpeg,pdf,doc,docx', 'max:10240'],
            'remove_template' => ['sometimes', 'boolean'],
        ]);
        if (empty($validated['template_file']) && empty($validated['remove_template'])) {
            abort(422, 'Choose a JPEG, PDF, or Word template to upload, or select remove template.');
        }

        $record = BarangayDocumentSetting::firstOrCreate(
            ['key' => self::KEY],
            ['settings' => self::DEFAULTS],
        );
        $disk = Storage::disk('local');

        if (!empty($validated['remove_template']) && $record->template_path) {
            $disk->delete($record->template_path);
            $record->template_path = null;
            $record->template_name = null;
        }

        if (!empty($validated['template_file'])) {
            $file = $validated['template_file'];
            $path = $file->store('document-templates/summons', 'local');
            abort_if($path === false, 500, 'Unable to store the uploaded summons template.');
            if ($record->template_path) {
                $disk->delete($record->template_path);
            }
            $record->template_path = $path;
            $record->template_name = $file->getClientOriginalName();
        }

        $record->save();

        return response()->json([
            'message' => !empty($validated['template_file']) ? 'Summons template uploaded.' : 'Summons template removed.',
            'data' => $this->serialize($record->fresh()),
        ]);
    }

    public function downloadTemplate()
    {
        $record = BarangayDocumentSetting::where('key', self::KEY)->first();
        $disk = Storage::disk('local');
        abort_unless($record?->template_path && $disk->exists($record->template_path), 404);

        return $disk->download(
            $record->template_path,
            $record->template_name ?: 'summons-template',
            ['Cache-Control' => 'private, no-store'],
        );
    }

    private function serialize(BarangayDocumentSetting $record): array
    {
        return array_merge(
            self::DEFAULTS,
            $record->settings ?? [],
            ['uploaded_template_name' => $record->template_name],
        );
    }
}
