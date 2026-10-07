<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\DocumentType;
use Illuminate\Http\Request;
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
        $validated = $this->validateDocumentType($request);
        $validated['value'] = $validated['value'] ?? Str::slug($validated['label']);
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

        $documentType->delete();

        return response()->json([
            'message' => 'Document type deleted.',
        ]);
    }

    private function validateDocumentType(Request $request, ?DocumentType $documentType = null): array
    {
        $ignoreId = $documentType?->id;
        $validated = $request->validate([
            'value' => ['sometimes', 'string', 'max:100', Rule::unique('document_types', 'value')->ignore($ignoreId)],
            'label' => ['required', 'string', 'max:150'],
            'fee_mode' => ['required', Rule::in(['fixed', 'assessed'])],
            'fee' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'one_time' => ['required', 'boolean'],
            'active' => ['required', 'boolean'],
            'template' => ['nullable', 'string', 'max:20000'],
            'applicant_fields' => ['present', 'array', 'max:30'],
            'applicant_fields.*.key' => ['required', 'regex:/^[a-z][a-z0-9_]{1,63}$/'],
            'applicant_fields.*.label' => ['required', 'string', 'max:100'],
            'applicant_fields.*.type' => ['required', Rule::in(['text', 'textarea', 'number', 'date', 'email', 'tel', 'select'])],
            'applicant_fields.*.required' => ['required', 'boolean'],
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
            'requirements.*.requiredWhen' => ['sometimes', 'array:key,value'],
            'requirements.*.requiredWhen.key' => ['required_with:requirements.*.requiredWhen', 'string', 'max:64'],
            'requirements.*.requiredWhen.value' => ['required_with:requirements.*.requiredWhen'],
        ]);

        foreach (array_merge($validated['applicant_fields'], $validated['fields']) as $field) {
            if ($field['type'] === 'select' && empty($field['options'])) {
                abort(422, "The {$field['label']} field needs at least one dropdown option.");
            }
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
            if (count($validated['applicant_fields']) + count($validated['fields']) === 0) {
                abort(422, 'A document type must include at least one form field.');
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
            'fee_mode' => $type->fee_mode,
            'fee' => $type->fee,
            'one_time' => $type->one_time,
            'active' => $type->active,
            'applicant_fields' => $type->applicant_fields ?? [],
            'fields' => $type->fields ?? [],
            'requirements' => $type->requirements ?? [],
            'template' => $type->template,
        ];
    }
}
