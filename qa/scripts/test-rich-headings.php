<?php

declare(strict_types=1);
require __DIR__ . '/../../apps/api/src/bootstrap.php';

$html = '';
for ($level = 1; $level <= 5; $level++) {
    $html .= "<h{$level} class=\"heading-{$level}\">Nagłówek {$level} — test</h{$level}>";
}
$html .= '<p>Zwykły akapit</p>';
$firstSave = sanitizeRichHtml($html);
$secondSave = sanitizeRichHtml($firstSave);
foreach ([$firstSave, $secondSave] as $saved) {
    for ($level = 1; $level <= 5; $level++) {
        $expected = "<h{$level} class=\"heading-{$level}\">Nagłówek {$level} — test</h{$level}>";
        if (!str_contains($saved, $expected)) {
            throw new RuntimeException("Heading H{$level} changed or stripped on save");
        }
    }
    if (!str_contains($saved, '<p>Zwykły akapit</p>')) {
        throw new RuntimeException('Existing paragraph content changed');
    }
}
echo "PASS: H1–H5 tags, classes and content survive initial save and resave\n";
