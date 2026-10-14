<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DocumentTypeController extends Controller
{
    public function residentIndex(Request $request)
    {
        $types = DocumentType::whereNotNull('value')->where('active', true)->orderBy('label')->get();
        $residentId = $request->user()->id;

        return response()->json([
            'data' => $types->map(function (DocumentType $type) use ($residentId) {
                $alreadyRequested = $type->one_time && DocumentRequest::where('resident_id', $residentId)
                    ->where('document_type', $type->value)
                    ->where('status', '!=', 'rejected')
                    ->exists();

                return $this->serialize($type) + [
                    'available' => !$alreadyRequested,
                    'unavailable_reason' => $alreadyRequested
                        ? 'This one-time certificate has already been requested or issued.'
                        : null,
                ];
            }),
        ]);
    }

    public function adminIndex()
    {
        return response()->json([
            'data' => DocumentType::whereNotNull('value')->orderBy('label')->get()->map(fn (DocumentType $type) => $this->serialize($type)),
        ]);
    }

    public function staffIndex()
    {
        return response()->json([
            'data' => DocumentType::whereNotNull('value')
                ->where('active', true)
                ->orderBy('label')
                ->get()
                ->map(fn (DocumentType $type) => $this->serialize($type)),
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->filled('value') && $request->filled('label')) {
            $request->merge(['value' => Str::slug($request->input('label'))]);
        }
        $validated = $this->validateDocumentType($request);
        $validated['name'] = $validated['label'];
        $validated['enabled'] = $validated['active'];

        return response()->json([
            'message' => 'Document type created.',
            'data' => $this->serialize(DocumentType::create($validated)),
        ], 201);
    }

    public function update(Request $request, DocumentType $documentType)
    {
        $validated = $this->validateDocumentType($request, $documentType);
        $validated['name'] = $validated['label'];
        $validated['enabled'] = $validated['active'];
        $documentType->update($validated);

        return response()->json([
            'message' => 'Document type updated.',
            'data' => $this->serialize($documentType->fresh()),
        ]);
    }

    public function destroy(DocumentType $documentType)
    {
        if (DocumentRequest::where('document_type', $documentType->value)->exists()) {
            return response()->json([
                'message' => 'This document type has request history and cannot be deleted. Disable it instead to stop new requests.',
            ], 409);
        }

        if ($documentType->uploaded_template_path) {
            Storage::disk('local')->delete($documentType->uploaded_template_path);
        }
        $documentType->delete();

        return response()->json([
            'message' => 'Document type deleted.',
        ]);
    }

    public function uploadTemplate(Request $request, DocumentType $documentType)
    {
        $validated = $request->validate([
            'template_file' => ['sometimes', 'file', 'mimes:jpg,jpeg,pdf,doc,docx', 'max:10240'],
            'remove_template' => ['sometimes', 'boolean'],
        ]);

        if (empty($validated['template_file']) && empty($validated['remove_template'])) {
            abort(422, 'Choose a JPEG, PDF, or Word document design to upload, or select remove template.');
        }

        $disk = Storage::disk('local');
        if (!empty($validated['remove_template']) && $documentType->uploaded_template_path) {
            $disk->delete($documentType->uploaded_template_path);
            $documentType->uploaded_template_path = null;
            $documentType->uploaded_template_name = null;
        }

        if (!empty($validated['template_file'])) {
            $file = $validated['template_file'];
            $path = $file->store('document-templates', 'local');
            abort_if($path === false, 500, 'Unable to store the uploaded document template.');
            if ($documentType->uploaded_template_path) {
                $disk->delete($documentType->uploaded_template_path);
            }
            $documentType->uploaded_template_path = $path;
            $documentType->uploaded_template_name = $file->getClientOriginalName();
        }

        $documentType->save();

        return response()->json([
            'message' => !empty($validated['template_file'])
                ? 'Uploaded template saved.'
                : 'Uploaded template removed.',
            'data' => $this->serialize($documentType->fresh()),
        ]);
    }

    public function downloadTemplate(DocumentType $documentType)
    {
        $disk = Storage::disk('local');
        abort_unless(
            $documentType->uploaded_template_path
                && $disk->exists($documentType->uploaded_template_path),
            404,
        );

        return $disk->download(
            $documentType->uploaded_template_path,
            $documentType->uploaded_template_name ?: 'document-template',
            ['Cache-Control' => 'private, no-store'],
        );
    }

    private function validateDocumentType(Request $request, ?DocumentType $documentType = null): array
    {
        $ignoreId = $documentType?->id;
        $validated = $request->validate([
            'value' => [$documentType ? 'sometimes' : 'required', 'string', 'max:100', Rule::unique('document_types', 'value')->ignore($ignoreId)],
            'label' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'fee_mode' => ['required', Rule::in(['fixed', 'assessed'])],
            'fee' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'one_time' => ['required', 'boolean'],
            'active' => ['required', 'boolean'],
            'template_enabled' => ['sometimes', 'boolean'],
            'template' => ['nullable', 'string', 'max:20000'],
            'paper_size' => ['sometimes', Rule::in(['letter', 'a4', 'legal'])],
            'document_layout' => ['sometimes', 'array'],
            'document_layout.content_top' => ['sometimes', 'integer', 'between:51,76'],
            'document_layout.content_left' => ['sometimes', 'integer', 'between:13,38'],
            'document_layout.content_right' => ['sometimes', 'integer', 'between:13,38'],
            'document_layout.content_bottom' => ['sometimes', 'integer', 'between:13,38'],
            'document_layout.font_size_pt' => ['sometimes', 'integer', 'between:10,14'],
            'document_layout.text_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'document_layout.accent_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'applicant_fields' => ['present', 'array', 'max:30'],
            'applicant_fields.*.key' => ['required', 'regex:/^[a-z][a-z0-9_]{1,63}$/'],
            'applicant_fields.*.label' => ['required', 'string', 'max:100'],
            'applicant_fields.*.type' => ['required', Rule::in(['text', 'textarea', 'number', 'date', 'email', 'tel', 'select'])],
            'applicant_fields.*.required' => ['required', 'boolean'],
            'applicant_fields.*.enabled' => ['sometimes', 'boolean'],
            'applicant_fields.*.min' => ['sometimes', 'numeric'],
            'applicant_fields.*.max' => ['sometimes', 'numeric'],
            'applicant_fields.*.step' => ['sometimes', 'numeric', 'gt:0'],
            'applicant_fields.*.maxLength' => ['sometimes', 'integer', 'between:1,20000'],
            'applicant_fields.*.options' => ['sometimes', 'array', 'max:50'],
            'applicant_fields.*.requiredWhen' => ['sometimes', 'array:key,value'],
            'applicant_fields.*.requiredWhen.key' => ['required_with:applicant_fields.*.requiredWhen', 'string', 'max:64'],
            'applicant_fields.*.requiredWhen.value' => ['required_with:applicant_fields.*.requiredWhen'],
            'applicant_fields.*.showWhen' => ['sometimes', 'array:key,value'],
            'applicant_fields.*.showWhen.key' => ['required_with:applicant_fields.*.showWhen', 'string', 'max:64'],
            'applicant_fields.*.showWhen.value' => ['required_with:applicant_fields.*.showWhen'],
            'fields' => ['present', 'array', 'max:30'],
            'fields.*.key' => ['required', 'regex:/^[a-z][a-z0-9_]{1,63}$/'],
            'fields.*.label' => ['required', 'string', 'max:100'],
            'fields.*.type' => ['required', Rule::in(['text', 'textarea', 'number', 'date', 'email', 'tel', 'select'])],
            'fields.*.required' => ['required', 'boolean'],
            'fields.*.enabled' => ['sometimes', 'boolean'],
            'fields.*.min' => ['sometimes', 'numeric'],
            'fields.*.max' => ['sometimes', 'numeric'],
            'fields.*.step' => ['sometimes', 'numeric', 'gt:0'],
            'fields.*.maxLength' => ['sometimes', 'integer', 'between:1,20000'],
            'fields.*.options' => ['sometimes', 'array', 'max:50'],
            'fields.*.requiredWhen' => ['sometimes', 'array:key,value'],
            'fields.*.requiredWhen.key' => ['required_with:fields.*.requiredWhen', 'string', 'max:64'],
            'fields.*.requiredWhen.value' => ['required_with:fields.*.requiredWhen'],
            'fields.*.showWhen' => ['sometimes', 'array:key,value'],
            'fields.*.showWhen.key' => ['required_with:fields.*.showWhen', 'string', 'max:64'],
            'fields.*.showWhen.value' => ['required_with:fields.*.showWhen'],
            'requirements' => ['present', 'array', 'max:20'],
            'requirements.*.key' => ['required', 'regex:/^[a-z][a-z0-9_]{1,63}$/'],
            'requirements.*.label' => ['required', 'string', 'max:100'],
            'requirements.*.required' => ['required', 'boolean'],
            'requirements.*.enabled' => ['sometimes', 'boolean'],
            'requirements.*.requiredWhen' => ['sometimes', 'array:key,value'],
            'requirements.*.requiredWhen.key' => ['required_with:requirements.*.requiredWhen', 'string', 'max:64'],
            'requirements.*.requiredWhen.value' => ['required_with:requirements.*.requiredWhen'],
            'requirements.*.showWhen' => ['sometimes', 'array:key,value'],
            'requirements.*.showWhen.key' => ['required_with:requirements.*.showWhen', 'string', 'max:64'],
            'requirements.*.showWhen.value' => ['required_with:requirements.*.showWhen'],
        ]);

        $allFieldKeys = array_merge(
            array_column($validated['applicant_fields'], 'key'),
            array_column($validated['fields'], 'key'),
        );
        if (count($allFieldKeys) !== count(array_unique($allFieldKeys))) {
            abort(422, 'Form field keys must be unique within a document type.');
        }
        $requirementKeys = array_column($validated['requirements'], 'key');
        if (count($requirementKeys) !== count(array_unique($requirementKeys))) {
            abort(422, 'Upload requirement keys must be unique within a document type.');
        }
        foreach (array_merge($validated['applicant_fields'], $validated['fields']) as $field) {
            if ($field['type'] === 'select' && empty($field['options'])) {
                abort(422, "The {$field['label']} field needs at least one dropdown option.");
            }
            if (isset($field['min'], $field['max']) && $field['min'] > $field['max']) {
                abort(422, "The minimum for {$field['label']} cannot exceed its maximum.");
            }
            foreach (['requiredWhen', 'showWhen'] as $conditionKey) {
                $conditionField = $field[$conditionKey]['key'] ?? null;
                if ($conditionField && ($conditionField === $field['key'] || !in_array($conditionField, $allFieldKeys, true))) {
                    abort(422, "The {$conditionKey} condition for {$field['label']} must reference a different configured form field.");
                }
            }
        }
        foreach ($validated['requirements'] as $requirement) {
            foreach (['requiredWhen', 'showWhen'] as $conditionKey) {
                $conditionField = $requirement[$conditionKey]['key'] ?? null;
                if ($conditionField && !in_array($conditionField, $allFieldKeys, true)) {
                    abort(422, "The {$conditionKey} condition for {$requirement['label']} must reference a configured form field.");
                }
            }
        }

        return $validated;
    }

    private function serialize(DocumentType $type): array
    {
        return [
            'id' => $type->id,
            'value' => $type->value,
            'label' => $type->label,
            'description' => $type->description,
            'fee_mode' => $type->fee_mode,
            'fee' => $type->fee,
            'one_time' => $type->one_time,
            'active' => $type->active,
            'applicant_fields' => $type->applicant_fields ?? [],
            'fields' => $type->fields ?? [],
            'requirements' => $type->requirements ?? [],
            'template' => $type->template,
            'template_enabled' => $type->template_enabled ?? true,
            'paper_size' => $type->paper_size ?: 'letter',
            'document_layout' => $type->document_layout ?? [],
            'uploaded_template_name' => $type->uploaded_template_name,
        ];
    }
}
